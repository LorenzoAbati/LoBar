import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import { createTheme, listThemes } from '@/lib/storage';
import { assetNames, makeManifest, themeInputSchema } from '@/lib/theme';

export const runtime = 'nodejs';

const pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_FRAME_BYTES = 512 * 1024;

function isPng(bytes: Uint8Array) {
  return pngSignature.every((value, index) => bytes[index] === value);
}

export async function GET() {
  return NextResponse.json(await listThemes());
}

export async function POST(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: 'Sign in with GitHub before publishing a pack.' }, { status: 401 });
    }

    const formData = await request.formData();
    const metadata = themeInputSchema.parse(JSON.parse(String(formData.get('metadata') ?? '{}')));
    const files: Record<string, Uint8Array> = {};

    for (const name of assetNames) {
      const file = formData.get(name);
      if (!(file instanceof File)) {
        return NextResponse.json({ error: `Missing ${name}.` }, { status: 400 });
      }
      if (file.type !== 'image/png' || file.size === 0 || file.size > MAX_FRAME_BYTES) {
        return NextResponse.json({ error: `${name} must be a PNG smaller than 512 KB.` }, { status: 400 });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isPng(bytes)) {
        return NextResponse.json({ error: `${name} is not a valid PNG.` }, { status: 400 });
      }
      files[name] = bytes;
    }

    const theme = await createTheme(metadata, viewer, makeManifest(metadata), files);
    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not publish this pack.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
