import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InstallPrompt } from '@/components/install-prompt';
import { ThemePreview } from '@/components/theme-preview';
import { getTheme } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = await getTheme(slug);
  if (!theme) notFound();
  return (
    <main className="shell">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">ʕ</span><span>LoBar</span></Link>
        <Link href="/create" className="button button-small">Create a pack</Link>
      </header>
      <Link href="/" className="back-link">← Back to marketplace</Link>
      <section className="theme-hero">
        <div>
          <p className="eyebrow">Created by {theme.authorName}</p>
          <h1>{theme.displayName}</h1>
          <p className="theme-description">{theme.description}</p>
          <dl className="theme-meta">
            <div><dt>License</dt><dd>{theme.license}</dd></div>
            <div><dt>Installs</dt><dd>{theme.downloads}</dd></div>
            <div><dt>Format</dt><dd>8 PNG frames</dd></div>
          </dl>
          <a className="button" href={`/api/themes/${theme.slug}/download`}>Download pack</a>
        </div>
        <ThemePreview theme={theme} />
      </section>
      <InstallPrompt name={theme.displayName} slug={theme.slug} />
    </main>
  );
}
