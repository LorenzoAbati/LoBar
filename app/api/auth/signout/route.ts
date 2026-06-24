import { NextResponse } from 'next/server';
import { cookieOptions, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
  return response;
}
