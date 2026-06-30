/**
 * Bundled open-source webfont manifest for shotframe.
 *
 * Every font here ships as a Latin-subset woff2 inside this package's `fonts/`
 * directory so the renderer is byte-for-byte deterministic across operating
 * systems (no reliance on whatever fonts the host OS happens to have).
 *
 * Variable fonts expose a `wght` axis (the `weight` field is a CSS range like
 * `'100 900'`); static fallbacks ship discrete 400 + 700 files.
 *
 * The package code is MIT, but each bundled font keeps its own upstream
 * license — see `../LICENSES/`.
 */

export type FontCategory = 'sans' | 'serif' | 'display' | 'mono';

export interface FontFile {
  /** woff2 filename relative to this package's `fonts/` directory. */
  src: string;
  /** CSS `font-weight`: a single weight ('400') or a variable range ('100 900'). */
  weight: string;
  style: 'normal' | 'italic';
}

export interface FontDef {
  /** Stable lookup id (kebab-case). */
  id: string;
  /** CSS `font-family` name. */
  family: string;
  category: FontCategory;
  /** One entry per shipped woff2 file. */
  files: FontFile[];
  /** SPDX-ish license identifier of the bundled font. */
  license: string;
}

export const DEFAULT_FONT_ID = 'inter';

export const FONTS: FontDef[] = [
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
  {
    id: 'montserrat',
    family: 'Montserrat',
    category: 'sans',
    license: 'OFL-1.1',
    files: [{ src: 'montserrat.woff2', weight: '100 900', style: 'normal' }],
  },
  {
    id: 'poppins',
    family: 'Poppins',
    category: 'sans',
    license: 'OFL-1.1',
    files: [
      { src: 'poppins-400.woff2', weight: '400', style: 'normal' },
      { src: 'poppins-700.woff2', weight: '700', style: 'normal' },
    ],
  },
  {
    id: 'plus-jakarta-sans',
    family: 'Plus Jakarta Sans',
    category: 'sans',
    license: 'OFL-1.1',
    files: [{ src: 'plus-jakarta-sans.woff2', weight: '200 800', style: 'normal' }],
  },
  {
    id: 'dm-sans',
    family: 'DM Sans',
    category: 'sans',
    license: 'OFL-1.1',
    files: [{ src: 'dm-sans.woff2', weight: '100 1000', style: 'normal' }],
  },
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    category: 'sans',
    license: 'OFL-1.1',
    files: [{ src: 'space-grotesk.woff2', weight: '300 700', style: 'normal' }],
  },
  {
    id: 'sora',
    family: 'Sora',
    category: 'sans',
    license: 'OFL-1.1',
    files: [{ src: 'sora.woff2', weight: '100 800', style: 'normal' }],
  },
];

/** Look up a font definition by its stable id. */
export function fontById(id: string): FontDef | undefined {
  return FONTS.find((f) => f.id === id);
}

/** The default font (Inter). Guaranteed to exist. */
export function defaultFont(): FontDef {
  const f = fontById(DEFAULT_FONT_ID);
  if (!f) throw new Error(`Default font "${DEFAULT_FONT_ID}" missing from manifest`);
  return f;
}
