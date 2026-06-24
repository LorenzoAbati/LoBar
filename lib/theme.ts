import { z } from 'zod';

export const MODES = ['thinking', 'typing'] as const;
export type Mode = (typeof MODES)[number];
export const FRAME_COUNT = 4;
export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 34;

export const assetNames = MODES.flatMap((mode) =>
  Array.from({ length: FRAME_COUNT }, (_, index) => `${mode}_${index}.png`),
);

export const themeInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.').min(3).max(48),
  displayName: z.string().trim().min(3).max(48),
  description: z.string().trim().min(12).max(280),
  license: z.enum(['CC-BY-4.0', 'MIT', 'All rights reserved']),
});

export type ThemeInput = z.infer<typeof themeInputSchema>;

export type ThemeManifest = ThemeInput & {
  formatVersion: 1;
  grid: { width: number; height: number; pixelSize: number };
  frames: Record<Mode, string[]>;
};

export type Theme = {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  authorId: string;
  authorName: string;
  license: ThemeInput['license'];
  manifest: ThemeManifest;
  assets: Record<string, string>;
  downloads: number;
  createdAt: string;
};

export function makeManifest(input: ThemeInput): ThemeManifest {
  return {
    ...input,
    formatVersion: 1,
    grid: { width: GRID_WIDTH, height: GRID_HEIGHT, pixelSize: 4 },
    frames: {
      thinking: Array.from({ length: FRAME_COUNT }, (_, index) => `thinking_${index}.png`),
      typing: Array.from({ length: FRAME_COUNT }, (_, index) => `typing_${index}.png`),
    },
  };
}

export function isAssetName(value: string): value is (typeof assetNames)[number] {
  return assetNames.includes(value as (typeof assetNames)[number]);
}
