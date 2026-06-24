/* eslint-disable @next/next/no-img-element -- Blob URLs are user-published and intentionally served directly. */
import Link from 'next/link';
import type { Theme } from '@/lib/theme';

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <article className="theme-card">
      <Link className="theme-card-preview" href={`/themes/${theme.slug}`} aria-label={`View ${theme.displayName}`}>
        <img src={theme.assets.thinking_0} alt="" width={128} height={136} />
        <span className="preview-label">Thinking + typing</span>
      </Link>
      <div className="theme-card-body">
        <div className="theme-card-title-row">
          <h3><Link href={`/themes/${theme.slug}`}>{theme.displayName}</Link></h3>
          <span className="license">{theme.license}</span>
        </div>
        <p>{theme.description}</p>
        <footer>By {theme.authorName} · {theme.downloads} {theme.downloads === 1 ? 'install' : 'installs'}</footer>
      </div>
    </article>
  );
}
