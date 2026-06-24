import { NextResponse } from 'next/server';
import { getTheme, readThemeAsset } from '@/lib/storage';
import { isAssetName } from '@/lib/theme';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; name: string }> },
) {
  const { slug, name } = await params;
  if (!isAssetName(name)) {
    return new NextResponse('Not found', { status: 404 });
  }
  const theme = await getTheme(slug);
  if (!theme) {
    return new NextResponse('Not found', { status: 404 });
  }
  try {
    const bytes = await readThemeAsset(theme, name);
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
