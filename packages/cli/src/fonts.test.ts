import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { FONTS } from '@shotframe/fonts';
import { resolveFont, fontsDir, FONT_WEIGHTS } from './fonts.js';
import type { BrandConfig } from '@shotframe/core';

/** Minimal brand factory — only the font fields matter here. */
function brand(over: Partial<BrandConfig>): BrandConfig {
  return { name: 'X', colors: { primary: '#000', accent: '#000', bg: '#000' }, ...over };
}

describe('resolveFont', () => {
  it('matches a bundled family (Montserrat) → ≥1 woff2 face', () => {
    const plan = resolveFont(brand({ font: 'Montserrat' }));
    expect(plan.family).toBe('Montserrat');
    expect(plan.faces.length).toBeGreaterThanOrEqual(1);
    expect(plan.faces.every((f) => f.file.endsWith('.woff2'))).toBe(true);
    expect(plan.faces.every((f) => f.family === 'Montserrat')).toBe(true);
  });

  it('empty/undefined font → default Inter with faces', () => {
    const plan = resolveFont(brand({ font: undefined }));
    expect(plan.family).toBe('Inter');
    expect(plan.faces.length).toBeGreaterThanOrEqual(1);
    expect(plan.faces[0].file).toBe('inter.woff2');
  });

  it('matches a multi-word family (Plus Jakarta Sans)', () => {
    const plan = resolveFont(brand({ font: 'Plus Jakarta Sans' }));
    expect(plan.family).toBe('Plus Jakarta Sans');
    expect(plan.faces.length).toBeGreaterThanOrEqual(1);
    expect(plan.faces[0].file).toBe('plus-jakarta-sans.woff2');
  });

  it('matches case-insensitively and on the first CSS stack token', () => {
    const plan = resolveFont(brand({ font: "'montserrat', sans-serif" }));
    expect(plan.family).toBe('Montserrat');
    expect(plan.faces.length).toBeGreaterThanOrEqual(1);
  });

  it('unknown family → best-effort, faces:[]', () => {
    const plan = resolveFont(brand({ font: 'Comic Unknowns' }));
    expect(plan.family).toBe('Comic Unknowns');
    expect(plan.faces).toEqual([]);
  });

  it('falls back to a custom fontFace when the family is not bundled', () => {
    const plan = resolveFont(
      brand({ font: 'MyBrand', fontFace: { family: 'MyBrand', src: './fonts/mybrand.woff2', weights: ['400', '700'] } }),
    );
    expect(plan.family).toBe('MyBrand');
    expect(plan.faces.length).toBe(2);
    expect(plan.faces.every((f) => f.file === './fonts/mybrand.woff2')).toBe(true);
  });
});

/**
 * The cross-OS determinism guarantee: for EVERY supported family the renderer
 * will always have at least one bundled woff2 face to load before render, and
 * that face file actually exists on disk. As long as this holds, text metrics
 * never fall back to a host system font — so output stays deterministic across
 * operating systems. (Plus the default, font unset → Inter, also yields a face.)
 */
describe('font-load determinism guarantee', () => {
  const dir = fontsDir();

  it.each(FONTS.map((f) => f.family))(
    'family "%s" resolves to ≥1 loadable woff2 face on disk',
    (family) => {
      const plan = resolveFont({ name: 'X', colors: { primary: '#000', accent: '#000', bg: '#000' }, font: family } as BrandConfig);
      expect(plan.family).toBe(family);
      expect(plan.faces.length).toBeGreaterThanOrEqual(1);
      for (const face of plan.faces) {
        expect(face.family).toBe(family);
        expect(face.file.endsWith('.woff2')).toBe(true);
        // the bundled face file is on disk (the shell can serve + load it)
        expect(existsSync(join(dir, face.file))).toBe(true);
      }
    },
  );

  it('default (no brand.font) → bundled Inter face on disk', () => {
    const plan = resolveFont(brand({ font: undefined }));
    expect(plan.family).toBe('Inter');
    expect(plan.faces.length).toBeGreaterThanOrEqual(1);
    expect(existsSync(join(dir, plan.faces[0].file))).toBe(true);
  });
});

describe('fontsDir', () => {
  it('resolves the on-disk bundled fonts dir containing inter.woff2', () => {
    const dir = fontsDir();
    expect(existsSync(join(dir, 'inter.woff2'))).toBe(true);
  });
});

describe('FONT_WEIGHTS', () => {
  it('is the four weights the engine draws', () => {
    expect([...FONT_WEIGHTS]).toEqual([400, 600, 700, 800]);
  });
});
