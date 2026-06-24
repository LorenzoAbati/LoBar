import { getTheme } from '@/lib/storage';

export const runtime = 'nodejs';

function installerScript(origin: string, slug: string) {
  const packageUrl = `${origin}/api/themes/${slug}/download`;
  const runtimeUrl = `${origin}/runtime/lobar.py`;
  return `#!/usr/bin/env bash
set -euo pipefail

THEME_SLUG="${slug}"
INSTALL_ROOT="${'${LOBAR_HOME:-$HOME/.local/share/lobar}'}"
BIN_DIR="${'${LOBAR_BIN_DIR:-$HOME/.local/bin}'}"
THEME_DIR="$INSTALL_ROOT/themes/$THEME_SLUG"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

command -v curl >/dev/null || { echo "LoBar requires curl." >&2; exit 1; }
command -v unzip >/dev/null || { echo "LoBar requires unzip." >&2; exit 1; }
command -v python3 >/dev/null || { echo "LoBar requires Python 3." >&2; exit 1; }

mkdir -p "$THEME_DIR" "$BIN_DIR"
curl -fsSL "${packageUrl}" -o "$TEMP_DIR/theme.zip"
unzip -tq "$TEMP_DIR/theme.zip" >/dev/null
rm -rf "$THEME_DIR"
mkdir -p "$THEME_DIR"
unzip -q "$TEMP_DIR/theme.zip" -d "$THEME_DIR"
curl -fsSL "${runtimeUrl}" -o "$BIN_DIR/lobar"
chmod 755 "$BIN_DIR/lobar"

echo "Installed '$THEME_SLUG' without changing Claude Code configuration."
echo "Run: $BIN_DIR/lobar --theme $THEME_SLUG"
`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const theme = await getTheme(slug);
  if (!theme) {
    return new Response('Theme not found', { status: 404 });
  }
  const origin = new URL(request.url).origin;
  return new Response(installerScript(origin, theme.slug), {
    headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Content-Disposition': `attachment; filename="install-${theme.slug}.sh"`,
      'Cache-Control': 'no-store',
    },
  });
}
