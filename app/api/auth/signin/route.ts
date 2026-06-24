import { NextResponse } from 'next/server';
import { cookieOptions, isAuthConfigured, makeOAuthState, OAUTH_STATE_COOKIE } from '@/lib/auth';

export async function GET(request: Request) {
  if (!isAuthConfigured) {
    return NextResponse.redirect(new URL('/create?error=auth-not-configured', request.url));
  }
  const origin = new URL(request.url).origin;
  const state = makeOAuthState();
  const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', process.env.GITHUB_ID!);
  authorizationUrl.searchParams.set('redirect_uri', `${origin}/api/auth/callback/github`);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('scope', 'read:user');
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions(10 * 60));
  return response;
}
