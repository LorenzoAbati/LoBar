import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const runtime = new URL('../public/runtime/lobar.py', import.meta.url).pathname;

test('the downloadable runtime compiles and exposes its version', async () => {
  await run('python3', ['-m', 'py_compile', runtime]);
  const { stdout } = await run('python3', [runtime, '--version']);
  assert.match(stdout, /^LoBar runtime 0\.1\.0/m);
});

test('the runtime never references Claude Code configuration files', async () => {
  const source = await readFile(runtime, 'utf8');
  assert.doesNotMatch(source, /\.claude\/settings|settings\.json|CLAUDE_CONFIG_DIR/);
  assert.match(source, /\.local\/share\/lobar/);
});
