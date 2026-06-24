import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { isDemoMode } from '@/lib/auth';
import { assetNames, type Theme, type ThemeInput, type ThemeManifest } from '@/lib/theme';

type StoredTheme = Theme;
type ThemeFiles = Record<string, Uint8Array>;

const demoDirectory = process.env.LOBAR_DATA_DIR ?? '/tmp/lobar-demo';
const demoIndexPath = path.join(demoDirectory, 'themes.json');

function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required outside LOBAR_DEMO_MODE.');
  }
  return neon(connectionString);
}

function assertStorageConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required outside LOBAR_DEMO_MODE.');
  }
}

async function readDemoThemes(): Promise<StoredTheme[]> {
  try {
    return JSON.parse(await readFile(demoIndexPath, 'utf8')) as StoredTheme[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeDemoThemes(themes: StoredTheme[]) {
  await mkdir(demoDirectory, { recursive: true });
  const temporaryPath = `${demoIndexPath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(themes, null, 2));
  await rename(temporaryPath, demoIndexPath);
}

function fromRow(row: Record<string, unknown>): Theme {
  return {
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    description: String(row.description),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    license: row.license as Theme['license'],
    manifest: row.manifest as ThemeManifest,
    assets: row.assets as Record<string, string>,
    downloads: Number(row.downloads),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listThemes(): Promise<Theme[]> {
  if (isDemoMode) {
    return (await readDemoThemes()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sql = database();
  const rows = await sql.query('SELECT * FROM themes ORDER BY created_at DESC');
  return rows.map((row) => fromRow(row as Record<string, unknown>));
}

export async function getTheme(slug: string): Promise<Theme | null> {
  if (isDemoMode) {
    return (await readDemoThemes()).find((theme) => theme.slug === slug) ?? null;
  }
  const sql = database();
  const rows = await sql.query('SELECT * FROM themes WHERE slug = $1 LIMIT 1', [slug]);
  return rows[0] ? fromRow(rows[0] as Record<string, unknown>) : null;
}

export async function createTheme(
  input: ThemeInput,
  viewer: { id: string; name: string },
  manifest: ThemeManifest,
  files: ThemeFiles,
): Promise<Theme> {
  for (const assetName of assetNames) {
    if (!files[assetName]) {
      throw new Error(`Missing required frame: ${assetName}`);
    }
  }
  if (await getTheme(input.slug)) {
    throw new Error('That URL slug is already in use.');
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  let assets: Record<string, string>;

  if (isDemoMode) {
    const assetDirectory = path.join(demoDirectory, 'assets', input.slug);
    await mkdir(assetDirectory, { recursive: true });
    await Promise.all(assetNames.map((name) => writeFile(path.join(assetDirectory, name), files[name])));
    assets = Object.fromEntries(assetNames.map((name) => [name, `/api/themes/${input.slug}/assets/${name}`]));
  } else {
    assertStorageConfigured();
    const uploaded = await Promise.all(
      assetNames.map(async (name) => {
        const result = await put(`themes/${input.slug}/${randomUUID()}-${name}`, Buffer.from(files[name]), {
          access: 'public',
          contentType: 'image/png',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return [name, result.url] as const;
      }),
    );
    assets = Object.fromEntries(uploaded);
  }

  const theme: Theme = {
    id,
    slug: input.slug,
    displayName: input.displayName,
    description: input.description,
    authorId: viewer.id,
    authorName: viewer.name,
    license: input.license,
    manifest,
    assets,
    downloads: 0,
    createdAt,
  };

  if (isDemoMode) {
    const themes = await readDemoThemes();
    themes.push(theme);
    await writeDemoThemes(themes);
  } else {
    const sql = database();
    await sql.query(
      `INSERT INTO themes (id, slug, display_name, description, author_id, author_name, license, manifest, assets, downloads, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11)`,
      [id, input.slug, input.displayName, input.description, viewer.id, viewer.name, input.license, JSON.stringify(manifest), JSON.stringify(assets), 0, createdAt],
    );
  }

  return theme;
}

export async function readThemeAsset(theme: Theme, name: string): Promise<ArrayBuffer> {
  const assetUrl = theme.assets[name];
  if (!assetUrl) {
    throw new Error('Asset not found.');
  }
  if (isDemoMode) {
    const bytes = await readFile(path.join(demoDirectory, 'assets', theme.slug, name));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  const response = await fetch(assetUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not retrieve ${name}.`);
  }
  return response.arrayBuffer();
}

export async function incrementDownloads(slug: string) {
  if (isDemoMode) {
    const themes = await readDemoThemes();
    const theme = themes.find((item) => item.slug === slug);
    if (theme) {
      theme.downloads += 1;
      await writeDemoThemes(themes);
    }
    return;
  }
  const sql = database();
  await sql.query('UPDATE themes SET downloads = downloads + 1 WHERE slug = $1', [slug]);
}
