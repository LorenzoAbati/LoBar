import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cookieOptions, createSession, isAuthConfigured, OAUTH_STATE_COOKIE, SESSION_COOKIE } from '@/lib/auth';

type GitHubUser = { id: number; login: string; name: string | null };

export async function GET(request: Request) {
  const callback = new URL(request.url);
  const code = callback.searchParams.get('code');
  const state = callback.searchParams.get('state');
  const expectedState = (await cookies()).get(OAUTH_STATE_COOKIE)?.value;
  const redirect = new URL('/create', callback.origin);
  if (!isAuthConfigured || !code || !state || !expectedState || state !== expectedState) {
    redirect.searchParams.set('error', 'github-auth-failed');
    return NextResponse.redirect(redirect);
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_ID!,
      client_secret: process.env.GITHUB_SECRET!,
      code,
      redirect_uri: `${callback.origin}/api/auth/callback/github`,
    }),
  });
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenResponse.ok || !token.access_token) {
    redirect.searchParams.set('error', 'github-token-failed');
    return NextResponse.redirect(redirect);
  }
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'LoBar' },
  });
  const user = (await userResponse.json()) as GitHubUser;
  if (!userResponse.ok || !user.id || !user.login) {
    redirect.searchParams.set('error', 'github-user-failed');
    return NextResponse.redirect(redirect);
  }

  const response = NextResponse.redirect(redirect);
  response.cookies.set(SESSION_COOKIE, await createSession({ id: `github:${user.id}`, name: user.name?.trim() || user.login }), cookieOptions(60 * 60 * 24 * 30));
  response.cookies.set(OAUTH_STATE_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
  return response;
}
