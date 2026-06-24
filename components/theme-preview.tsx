'use client';
/* eslint-disable @next/next/no-img-element -- Blob URLs are user-published and intentionally served directly. */

import { useEffect, useState } from 'react';
import type { Theme } from '@/lib/theme';

export function ThemePreview({ theme }: { theme: Theme }) {
  const [mode, setMode] = useState<'thinking' | 'typing'>('thinking');
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setFrame((value) => (value + 1) % 4), mode === 'thinking' ? 450 : 110);
    return () => window.clearInterval(interval);
  }, [mode]);
  const frameName = `${mode}_${frame}.png`;
  return (
    <div className="theme-preview-panel">
      <div className="mode-switch" role="tablist" aria-label="Animation mode">
        {(['thinking', 'typing'] as const).map((item) => (
          <button key={item} role="tab" aria-selected={mode === item} className={mode === item ? 'active' : ''} onClick={() => { setMode(item); setFrame(0); }}>
            {item}
          </button>
        ))}
      </div>
      <div className="theme-preview-canvas">
        <img src={theme.assets[frameName]} alt={`${theme.displayName} ${mode} animation frame`} width={256} height={272} />
      </div>
      <p><span className="status-dot" /> Previewing the {mode} loop</p>
    </div>
  );
}
