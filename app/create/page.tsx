import Link from 'next/link';
import { SignInButton } from '@/components/sign-in-button';
import { ThemeStudio } from '@/components/theme-studio';
import { getViewer, isAuthConfigured, isDemoMode } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function CreatePage() {
  const viewer = await getViewer();
  return (
    <main className="shell">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">ʕ</span><span>LoBar</span></Link>
        <Link href="/" className="text-link">Marketplace</Link>
      </header>
      <section className="create-intro">
        <p className="eyebrow">Pack editor</p>
        <h1>Draw both loops. Own the result.</h1>
        <p>LoBar exports a portable set of eight transparent PNG frames: four for thinking and four for typing.</p>
      </section>
      {viewer ? <ThemeStudio authorName={viewer.name} /> : (
        <section className="auth-gate">
          <h2>Publish under your GitHub identity</h2>
          <p>Every pack has a clear creator and ownership record. We only use GitHub to identify the publisher.</p>
          {isAuthConfigured ? <SignInButton /> : <p className="error-message">This production deployment is missing GitHub OAuth. Add the required environment variables before publishing.</p>}
          {isDemoMode ? <p className="hint">Demo mode should sign you in automatically. Refresh the page if this message remains.</p> : null}
        </section>
      )}
    </main>
  );
}
