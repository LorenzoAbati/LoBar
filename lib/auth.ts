import { getServerSession, type NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

export type Viewer = {
  id: string;
  name: string;
};

export const isDemoMode = process.env.LOBAR_DEMO_MODE === '1';
export const isAuthConfigured = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET && process.env.NEXTAUTH_SECRET);

export const authOptions: NextAuthOptions = {
  providers: isAuthConfigured
    ? [
        GitHubProvider({
          clientId: process.env.GITHUB_ID!,
          clientSecret: process.env.GITHUB_SECRET!,
        }),
      ]
    : [],
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

export async function getViewer(): Promise<Viewer | null> {
  if (isDemoMode) {
    return { id: 'demo-designer', name: 'Local designer' };
  }

  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id ?? session?.user?.email;
  if (!id || !session?.user?.name) {
    return null;
  }
  return { id, name: session.user.name };
}
