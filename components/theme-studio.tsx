'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FRAME_COUNT, GRID_HEIGHT, GRID_WIDTH, type Mode } from '@/lib/theme';

type Pixel = string | null;
type Frame = Pixel[];
type FrameSet = Record<Mode, Frame[]>;

const palette = [
  { value: '#241508', label: 'Cocoa' },
  { value: '#915f23', label: 'Brown' },
  { value: '#be8a3e', label: 'Gold' },
  { value: '#e6b969', label: 'Sand' },
  { value: '#eb9187', label: 'Blush' },
  { value: '#eef2f8', label: 'Cloud' },
  { value: '#322350', label: 'Ink' },
  { value: '#5b73d2', label: 'Glow' },
];

const transparent = null;

function blankFrame(): Frame {
  return Array.from({ length: GRID_WIDTH * GRID_HEIGHT }, () => transparent);
}

function paint(frame: Frame, row: number, from: number, to: number, color: string) {
  for (let col = from; col <= to; col += 1) frame[row * GRID_WIDTH + col] = color;
}

function starterFrame(mode: Mode, frameNumber: number): Frame {
  const frame = blankFrame();
  const dark = '#241508'; const brown = '#915f23'; const gold = '#be8a3e'; const sand = '#e6b969'; const cloud = '#eef2f8'; const ink = '#322350'; const glow = '#5b73d2';
  // Ears, head, muzzle, body, and a small keyboard. Deliberately simple so it is easy to edit.
  paint(frame, 7, 9, 11, dark); paint(frame, 7, 20, 22, dark);
  paint(frame, 8, 8, 23, dark); paint(frame, 9, 6, 25, dark); paint(frame, 10, 5, 26, dark);
  for (let row = 10; row <= 17; row += 1) paint(frame, row, 6, 25, brown);
  paint(frame, 11, 9, 11, ink); paint(frame, 11, 20, 22, ink);
  paint(frame, 15, 8, 23, sand); paint(frame, 16, 8, 23, sand); paint(frame, 17, 9, 22, sand);
  for (let row = 18; row <= 27; row += 1) paint(frame, row, 6, 25, brown);
  for (let row = 20; row <= 26; row += 1) paint(frame, row, 11, 20, gold);
  for (let row = 29; row <= 33; row += 1) paint(frame, row, 0, 31, ink);
  for (let col = 2; col < 30; col += 3) paint(frame, 30 + (col % 2), col, col + 1, glow);
  if (mode === 'thinking') {
    paint(frame, 2, 11, 20, cloud); paint(frame, 3, 9, 22, cloud); paint(frame, 4, 8, 23, cloud); paint(frame, 5, 10, 21, cloud);
    for (let dot = 0; dot < frameNumber; dot += 1) paint(frame, 4, 12 + dot * 4, 13 + dot * 4, ink);
    paint(frame, 8, 13, 14, cloud);
  } else {
    const leftLow = frameNumber % 2 === 0;
    paint(frame, leftLow ? 21 : 18, 1, 4, brown);
    paint(frame, leftLow ? 22 : 18, 27, 30, brown);
    paint(frame, 30, 4 + frameNumber * 5, 5 + frameNumber * 5, glow);
  }
  return frame;
}

function starterFrames(): FrameSet {
  return {
    thinking: Array.from({ length: FRAME_COUNT }, (_, index) => starterFrame('thinking', index)),
    typing: Array.from({ length: FRAME_COUNT }, (_, index) => starterFrame('typing', index)),
  };
}

async function pngFromFrame(frame: Frame): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_WIDTH * 4;
  canvas.height = GRID_HEIGHT * 4;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available in this browser.');
  for (let row = 0; row < GRID_HEIGHT; row += 1) {
    for (let col = 0; col < GRID_WIDTH; col += 1) {
      const color = frame[row * GRID_WIDTH + col];
      if (color) {
        context.fillStyle = color;
        context.fillRect(col * 4, row * 4, 4, 4);
      }
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not render this frame.')), 'image/png'));
}

export function ThemeStudio({ authorName }: { authorName: string }) {
  const router = useRouter();
  const [frames, setFrames] = useState<FrameSet>(starterFrames);
  const [mode, setMode] = useState<Mode>('thinking');
  const [frameIndex, setFrameIndex] = useState(0);
  const [color, setColor] = useState<string | null>(palette[2].value);
  const [metadata, setMetadata] = useState({ displayName: '', slug: '', description: '', license: 'CC-BY-4.0' });
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const activeFrame = frames[mode][frameIndex];
  const filledPixels = useMemo(() => activeFrame.filter(Boolean).length, [activeFrame]);

  function setPixel(index: number) {
    setFrames((current) => {
      const next = { ...current, [mode]: [...current[mode]] };
      const frame = [...next[mode][frameIndex]];
      frame[index] = color;
      next[mode][frameIndex] = frame;
      return next;
    });
  }

  function clearFrame() {
    setFrames((current) => {
      const next = { ...current, [mode]: [...current[mode]] };
      next[mode][frameIndex] = blankFrame();
      return next;
    });
  }

  async function publish() {
    setError('');
    if (!metadata.displayName || !metadata.slug || !metadata.description) {
      setError('Add a name, URL slug, and description before publishing.');
      return;
    }
    if (Object.values(frames).flat().some((frame) => !frame.some(Boolean))) {
      setError('Every thinking and typing frame needs at least one painted pixel.');
      return;
    }
    setIsPublishing(true);
    try {
      const body = new FormData();
      body.append('metadata', JSON.stringify(metadata));
      for (const currentMode of ['thinking', 'typing'] as const) {
        for (let index = 0; index < FRAME_COUNT; index += 1) {
          body.append(`${currentMode}_${index}.png`, await pngFromFrame(frames[currentMode][index]), `${currentMode}_${index}.png`);
        }
      }
      const response = await fetch('/api/themes', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not publish this pack.');
      router.push(`/themes/${result.slug}`);
      router.refresh();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Could not publish this pack.');
      setIsPublishing(false);
    }
  }

  return (
    <section className="studio">
      <div className="studio-main">
        <div className="studio-toolbar">
          <div className="mode-switch" role="tablist" aria-label="Frame mode">
            {(['thinking', 'typing'] as const).map((item) => <button key={item} className={mode === item ? 'active' : ''} role="tab" aria-selected={mode === item} onClick={() => { setMode(item); setFrameIndex(0); }}>{item}</button>)}
          </div>
          <span className="pixel-count">{filledPixels} pixels</span>
        </div>
        <div className="frame-selector" aria-label="Animation frames">
          {Array.from({ length: FRAME_COUNT }, (_, index) => <button key={index} className={frameIndex === index ? 'active' : ''} onClick={() => setFrameIndex(index)}>Frame {index + 1}</button>)}
          <button className="quiet-button" onClick={clearFrame}>Clear frame</button>
        </div>
        <div className="pixel-editor" style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)` }} aria-label={`${mode} frame ${frameIndex + 1} pixel editor`}>
          {activeFrame.map((pixel, index) => <button key={index} aria-label={`Pixel ${index + 1}`} className="pixel" style={{ backgroundColor: pixel ?? 'transparent' }} onClick={() => setPixel(index)} />)}
        </div>
        <div className="palette" aria-label="Palette">
          <button className={!color ? 'selected erase' : 'erase'} onClick={() => setColor(null)} aria-label="Eraser">⌫</button>
          {palette.map((item) => <button key={item.value} className={color === item.value ? 'selected' : ''} style={{ backgroundColor: item.value }} onClick={() => setColor(item.value)} aria-label={item.label} />)}
        </div>
      </div>
      <aside className="publish-panel">
        <p className="eyebrow">Publishing as {authorName}</p>
        <h2>Pack details</h2>
        <label>Pack name<input value={metadata.displayName} maxLength={48} placeholder="Night Shift Capy" onChange={(event) => setMetadata((value) => ({ ...value, displayName: event.target.value }))} /></label>
        <label>URL slug<input value={metadata.slug} maxLength={48} placeholder="night-shift-capy" onChange={(event) => setMetadata((value) => ({ ...value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} /></label>
        <label>Description<textarea value={metadata.description} maxLength={280} placeholder="A calm, midnight-blue companion for long coding sessions." onChange={(event) => setMetadata((value) => ({ ...value, description: event.target.value }))} /></label>
        <label>License<select value={metadata.license} onChange={(event) => setMetadata((value) => ({ ...value, license: event.target.value }))}><option>CC-BY-4.0</option><option>MIT</option><option>All rights reserved</option></select></label>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="button publish-button" onClick={publish} disabled={isPublishing}>{isPublishing ? 'Publishing…' : 'Publish pack'}</button>
        <p className="hint">Publishing stores your eight PNG frames and a manifest. You keep attribution and ownership.</p>
      </aside>
    </section>
  );
}
