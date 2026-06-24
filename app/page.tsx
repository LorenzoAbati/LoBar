import Link from 'next/link';
import { ThemeCard } from '@/components/theme-card';
import { listThemes } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const themes = await listThemes();
  return (
    <main className="shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="LoBar home">
          <span className="brand-mark">ʕ</span>
          <span>LoBar</span>
        </Link>
        <nav>
          <Link href="/create" className="button button-small">Create a pack</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">Animation packs for Claude Code</p>
        <h1>Give your terminal companion a personality.</h1>
        <p className="hero-copy">Draw a thinking loop and a typing loop, publish the pack, and share a single install command. No Claude Code configuration changes required.</p>
        <div className="hero-actions">
          <Link href="/create" className="button">Create a pack</Link>
          <a href="#packs" className="text-link">Browse packs <span aria-hidden>↓</span></a>
        </div>
      </section>

      <section id="packs" className="catalogue" aria-labelledby="packs-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2 id="packs-title">Fresh packs</h2>
          </div>
          <span className="count">{themes.length} {themes.length === 1 ? 'pack' : 'packs'}</span>
        </div>
        {themes.length ? (
          <div className="theme-grid">
            {themes.map((theme) => <ThemeCard key={theme.id} theme={theme} />)}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-art">ʕ•ᴥ•ʔ</p>
            <h3>The shelf is ready.</h3>
            <p>Be the first designer to publish a LoBar pack.</p>
            <Link href="/create" className="button">Open the editor</Link>
          </div>
        )}
      </section>
    </main>
  );
}
