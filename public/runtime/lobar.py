#!/usr/bin/env python3
"""LoBar runtime — a zero-config Claude Code terminal companion launcher.

Installed animation packs live below ~/.local/share/lobar/themes. This program
does not read, write, or require any Claude Code configuration file.
"""

import argparse
import base64
import fcntl
import os
import pty
import select
import shutil
import signal
import struct
import subprocess
import sys
import termios
import threading
import time
import tty

IDLE, THINKING, TYPING = 'idle', 'thinking', 'typing'
FRAME_COUNT = 4


def theme_home():
    return os.environ.get('LOBAR_HOME', os.path.expanduser('~/.local/share/lobar'))


def is_iterm2():
    return 'ITERM_SESSION_ID' in os.environ or os.environ.get('TERM_PROGRAM') == 'iTerm.app'


def terminal_size():
    try:
        packed = struct.pack('HHHH', 0, 0, 0, 0)
        rows, cols = struct.unpack('HHHH', fcntl.ioctl(sys.stderr.fileno(), termios.TIOCGWINSZ, packed))[:2]
        return rows or 24, cols or 80
    except OSError:
        return 24, 80


class StreamAnalyzer:
    """Classify sustained terminal redraw traffic without false startup states."""

    TYPING_THRESHOLD = 1500
    IDLE_TIMEOUT = 1.2
    HYSTERESIS_S = 0.40
    WINDOW = 0.25
    STARTUP_GUARD = 0.75

    def __init__(self):
        now = time.monotonic()
        self._chunks = []
        self._lock = threading.Lock()
        self._last = now
        self._started_at = now
        self._state = IDLE
        self._candidate = IDLE
        self._candidate_since = now

    def push(self, data):
        if not data:
            return
        now = time.monotonic()
        with self._lock:
            self._chunks.append((now, len(data)))
            self._last = now

    def state_and_bps(self):
        now = time.monotonic()
        with self._lock:
            last = self._last
            cutoff = now - self.WINDOW
            self._chunks = [(timestamp, size) for timestamp, size in self._chunks if timestamp > cutoff]
            total = sum(size for _, size in self._chunks)

        if now - last > self.IDLE_TIMEOUT:
            self._state = IDLE
            self._candidate = IDLE
            self._candidate_since = now
            return IDLE, 0.0

        bps = total / self.WINDOW
        if now - self._started_at < self.STARTUP_GUARD:
            return THINKING, bps
        if total == 0:
            if now - last > self.WINDOW:
                self._candidate = self._state
                self._candidate_since = now
            return self._state, 0.0

        observed = TYPING if bps > self.TYPING_THRESHOLD else THINKING
        if observed != self._candidate:
            self._candidate = observed
            self._candidate_since = now
        if self._candidate != self._state and now - self._candidate_since >= self.HYSTERESIS_S:
            self._state = self._candidate
        return self._state, bps


class Renderer:
    IMG_W_CELLS = 9
    IMG_H_CELLS = 6

    def __init__(self, frames_dir, output_lock):
        self._frames_dir = frames_dir
        self._use_iterm2 = is_iterm2()
        self._tty = open('/dev/tty', 'wb', buffering=0)
        self._lock = output_lock
        self._cache = {}
        self._last_key = ''

    def _write(self, data):
        try:
            with self._lock:
                view = memoryview(data)
                while view:
                    written = self._tty.write(view)
                    if not written:
                        break
                    view = view[written:]
        except OSError:
            pass

    def _encoded(self, frame_key):
        if frame_key not in self._cache:
            with open(os.path.join(self._frames_dir, f'{frame_key}.png'), 'rb') as image:
                self._cache[frame_key] = base64.b64encode(image.read()).decode()
        return self._cache[frame_key]

    def render(self, frame_key, rows, cols):
        if frame_key == self._last_key:
            return
        self._last_key = frame_key
        col = max(1, cols - self.IMG_W_CELLS - 1)
        if self._use_iterm2:
            payload = (
                b'\033[s'
                + f'\033[1;{col}H'.encode()
                + (f'\033]1337;File=inline=1;width={self.IMG_W_CELLS};height={self.IMG_H_CELLS};'
                   f'preserveAspectRatio=1;doNotMoveCursor=1:{self._encoded(frame_key)}\007').encode()
                + b'\033[u'
            )
        else:
            index = int(frame_key[-1])
            if frame_key.startswith('thinking'):
                lines = [f'( ·{"." * index:<3})', 'ʕ•ᴥ•ʔ']
            elif frame_key.startswith('typing'):
                lines = ['ʕ•ᴥ•ʔ', ['/|_|\\', '\\|_|/', '/|_|\\', '\\|_|/'][index]]
            else:
                lines = ['ʕ•ᴥ•ʔ', '  |_|  ']
            payload = b'\033[s'
            for offset, line in enumerate(lines):
                payload += f'\033[{offset + 1};{max(1, cols - 8)}H\033[K{line}'.encode()
            payload += b'\033[u'
        self._write(payload)

    def clear(self, rows, cols):
        col = max(1, cols - self.IMG_W_CELLS - 1)
        payload = b'\033[s'
        for offset in range(self.IMG_H_CELLS):
            payload += f'\033[{offset + 1};{col}H\033[K'.encode()
        self._write(payload + b'\033[u')
        self._tty.close()


class Animator(threading.Thread):
    def __init__(self, analyzer, frames_dir, output_lock):
        super().__init__(daemon=True)
        self._analyzer = analyzer
        self._renderer = Renderer(frames_dir, output_lock)
        self._running = True
        self._frame = 0

    def run(self):
        while self._running:
            state, bps = self._analyzer.state_and_bps()
            rows, cols = terminal_size()
            if state == THINKING:
                key, sleep = f'thinking_{self._frame % FRAME_COUNT}', 0.45
            elif state == TYPING:
                key = f'typing_{self._frame % FRAME_COUNT}'
                sleep = 1 / (20.0 if bps >= 350 else 13.0 if bps >= 180 else 7.0)
            else:
                key, sleep = 'typing_1', 1.0
            self._renderer.render(key, rows, cols)
            self._frame += 1
            time.sleep(sleep)

    def stop(self):
        self._running = False
        self._renderer.clear(*terminal_size())


def find_claude():
    executable = shutil.which('claude')
    if executable:
        return executable
    for candidate in (os.path.expanduser('~/.local/bin/claude'), '/usr/local/bin/claude', '/opt/homebrew/bin/claude'):
        if os.path.isfile(candidate):
            return candidate
    raise FileNotFoundError('Claude Code was not found on PATH.')


def parse_arguments():
    parser = argparse.ArgumentParser(description='Run Claude Code with a LoBar animation pack.')
    parser.add_argument('--theme', help='Installed LoBar theme slug.')
    parser.add_argument('--theme-dir', help='Absolute directory containing manifest.json and frames/.')
    parser.add_argument('--version', action='store_true')
    return parser.parse_known_args()


def write_terminal(lock, fd, data):
    with lock:
        view = memoryview(data)
        while view:
            written = os.write(fd, view)
            if not written:
                break
            view = view[written:]


def main():
    args, claude_args = parse_arguments()
    if args.version:
        print('LoBar runtime 0.1.0')
        return 0
    if not args.theme:
        raise ValueError('--theme is required when launching Claude Code.')
    theme_dir = args.theme_dir or os.path.join(theme_home(), 'themes', args.theme)
    frames_dir = os.path.join(theme_dir, 'frames')
    required = [os.path.join(frames_dir, f'{mode}_{index}.png') for mode in ('thinking', 'typing') for index in range(FRAME_COUNT)]
    if not os.path.isfile(os.path.join(theme_dir, 'manifest.json')) or not all(os.path.isfile(file) for file in required):
        raise FileNotFoundError(f"'{args.theme}' is not an installed LoBar pack. Re-run its install command.")
    if not sys.stdout.isatty():
        os.execvp(find_claude(), ['claude', *claude_args])

    analyzer = StreamAnalyzer()
    terminal_lock = threading.Lock()
    animator = Animator(analyzer, frames_dir, terminal_lock)
    animator.start()
    master_fd, slave_fd = pty.openpty()
    rows, cols = terminal_size()
    try:
        fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
    except OSError:
        pass
    process = subprocess.Popen([find_claude(), *claude_args], stdin=slave_fd, stdout=slave_fd, stderr=slave_fd, close_fds=True, preexec_fn=os.setsid)
    os.close(slave_fd)
    old_tty = None
    try:
        old_tty = termios.tcgetattr(sys.stdin.fileno())
        tty.setraw(sys.stdin.fileno())
    except OSError:
        pass

    def resize(_signal, _frame):
        try:
            fcntl.ioctl(master_fd, termios.TIOCSWINSZ, struct.pack('HHHH', *terminal_size(), 0, 0))
        except OSError:
            pass

    signal.signal(signal.SIGWINCH, resize)
    try:
        while process.poll() is None:
            ready, _, _ = select.select([master_fd, sys.stdin.fileno()], [], [], 0.04)
            if master_fd in ready:
                try:
                    data = os.read(master_fd, 8192)
                except OSError:
                    break
                if data:
                    analyzer.push(data)
                    write_terminal(terminal_lock, sys.stdout.fileno(), data)
            if sys.stdin.fileno() in ready:
                try:
                    data = os.read(sys.stdin.fileno(), 256)
                except OSError:
                    break
                if data:
                    os.write(master_fd, data)
    except KeyboardInterrupt:
        process.send_signal(signal.SIGINT)
    finally:
        if old_tty is not None:
            termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, old_tty)
        animator.stop()
        os.close(master_fd)
    return process.wait()


if __name__ == '__main__':
    sys.exit(main())
