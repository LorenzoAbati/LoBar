import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'LoBar — Claude Code companion packs',
  description: 'Design, publish, and install pixel animation packs for your Claude Code terminal companion.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
