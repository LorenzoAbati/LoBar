'use client';

import { useState, useSyncExternalStore } from 'react';

export function InstallPrompt({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => '',
  );
  const installUrl = origin ? `${origin}/api/themes/${slug}/install.sh` : `/api/themes/${slug}/install.sh`;
  const prompt = `Install the “${name}” LoBar companion pack. Run this command in the terminal:\n\ncurl -fsSL "${installUrl}" | bash\n\nDo not change any Claude Code configuration. Once the install completes, run ~/.local/bin/lobar --theme ${slug}.`;
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return (
    <section className="install-prompt" aria-labelledby="install-prompt-title">
      <div className="install-prompt-heading">
        <div>
          <p className="eyebrow">Paste into Claude Code</p>
          <h2 id="install-prompt-title">Install without touching its config</h2>
        </div>
        <button className="button button-small" onClick={copyPrompt}>{copied ? 'Copied' : 'Copy prompt'}</button>
      </div>
      <pre>{prompt}</pre>
      <p className="hint">Claude Code can run the command with your approval. The installer only adds the LoBar runtime and this pack under your local user directory.</p>
    </section>
  );
}
