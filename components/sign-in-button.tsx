'use client';

import { signIn } from 'next-auth/react';

export function SignInButton() {
  return <button className="button" onClick={() => signIn('github', { callbackUrl: '/create' })}>Sign in with GitHub</button>;
}
