import { describe, it, expect } from 'vitest';
import {
  manifestFaces,
  findFontByFamily,
  facesForFamily,
  normalizeCurrentFont,
  isCustomFamily,
  type ManifestFont,
} from './fonts.js';

const MANIFEST: ManifestFont[] = [
  {
    id: 'inter',
    family: 'Inter',
    category: 'sans',
    license: 'OFL-1.1',
    files: [{ src: 'inter.woff2', weight: '100 900', style: 'normal' }],
  },
  {
    id: 'roboto',
    family: 'Roboto',
    category: 'sans',
    license: 'OFL-1.1',
    files: [
      { src: 'roboto-400.woff2', weight: '400', style: 'normal' },
      { src: 'roboto-700.woff2', weight: '700', style: 'normal' },
    ],
  },
];

describe('manifestFaces', () => {
  it('flattens every file into a FaceSpec with a /fonts/ url', () => {
    expect(manifestFaces(MANIFEST)).toEqual([
      { family: 'Inter', url: '/fonts/inter.woff2', weight: '100 900', style: 'normal' },
      { family: 'Roboto', url: '/fonts/roboto-400.woff2', weight: '400', style: 'normal' },
      { family: 'Roboto', url: '/fonts/roboto-700.woff2', weight: '700', style: 'normal' },
    ]);
  });

  it('honours a custom base path', () => {
    expect(manifestFaces([MANIFEST[0]], 'https://cdn/x/')).toEqual([
      { family: 'Inter', url: 'https://cdn/x/inter.woff2', weight: '100 900', style: 'normal' },
    ]);
  });

  it('returns empty for an empty manifest', () => {
    expect(manifestFaces([])).toEqual([]);
  });
});

describe('findFontByFamily', () => {
  it('matches case-insensitively', () => {
    expect(findFontByFamily(MANIFEST, 'inter')?.id).toBe('inter');
    expect(findFontByFamily(MANIFEST, 'ROBOTO')?.id).toBe('roboto');
  });

  it('returns undefined for an unknown family', () => {
    expect(findFontByFamily(MANIFEST, 'Comic Sans')).toBeUndefined();
  });
});

describe('facesForFamily', () => {
  it('returns only that family faces', () => {
    expect(facesForFamily(MANIFEST, 'Roboto').map((f) => f.url)).toEqual([
      '/fonts/roboto-400.woff2',
      '/fonts/roboto-700.woff2',
    ]);
  });

  it('returns empty for a non-manifest family', () => {
    expect(facesForFamily(MANIFEST, 'My Font')).toEqual([]);
  });
});

describe('normalizeCurrentFont', () => {
  it('returns the manifest canonical casing when matched', () => {
    expect(normalizeCurrentFont(MANIFEST, 'inter')).toBe('Inter');
  });

  it('keeps a custom family verbatim', () => {
    expect(normalizeCurrentFont(MANIFEST, 'My Brand Font')).toBe('My Brand Font');
  });

  it('falls back to Inter when empty/undefined', () => {
    expect(normalizeCurrentFont(MANIFEST, undefined)).toBe('Inter');
    expect(normalizeCurrentFont(MANIFEST, '   ')).toBe('Inter');
    expect(normalizeCurrentFont(MANIFEST, '', 'Roboto')).toBe('Roboto');
  });
});

describe('isCustomFamily', () => {
  it('is false for manifest fonts, true otherwise', () => {
    expect(isCustomFamily(MANIFEST, 'Inter')).toBe(false);
    expect(isCustomFamily(MANIFEST, 'My Font')).toBe(true);
  });
});
