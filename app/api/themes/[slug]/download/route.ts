import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { getTheme, incrementDownloads, readThemeAsset } from '@/lib/storage';
import { assetNames } from '@/lib/theme';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const theme = await getTheme(slug);
  if (!theme) {
    return new NextResponse('Theme not found', { status: 404 });
  }

  const zip = new JSZip();
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        ...theme.manifest,
        author: { name: theme.authorName, id: theme.authorId },
        createdAt: theme.createdAt,
        license: theme.license,
      },
      null,
      2,
    ),
  );
  await Promise.all(
    assetNames.map(async (name) => {
      zip.file(`frames/${name}`, await readThemeAsset(theme, name));
    }),
  );
  const body = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  await incrementDownloads(slug);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${theme.slug}.lobar.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
