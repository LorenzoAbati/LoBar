import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

export type Viewer = {
  id: string;
  name: string;
};

export const isDemoMode = process.env.LOBAR_DEMO_MODE === '1';
export const isAuthConfigured = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.AUTH_SECRET);
export const SESSION_COOKIE = 'lobar_session';
export const OAUTH_STATE_COOKIE = 'lobar_oauth_state';

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required outside LOBAR_DEMO_MODE.');
  return new TextEncoder().encode(secret);
}

export function makeOAuthState() {
  return randomUUID();
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function createSession(viewer: Viewer) {
  return new SignJWT({ name: viewer.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(viewer.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey());
}

export async function getViewer(): Promise<Viewer | null> {
  if (isDemoMode) return { id: 'demo-designer', name: 'Local designer' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== 'string' || typeof payload.name !== 'string') return null;
    return { id: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}
