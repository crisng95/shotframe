/**
 * Font resolution + the load-before-render contract for the CLI.
 *
 * `brand.font` is a CSS family NAME (e.g. "Inter", "Montserrat", "Plus Jakarta
 * Sans"). We match it against the bundled `@shotframe/fonts` manifest and return
 * the woff2 face(s) to load. The shell (render.ts / studio.ts) serves those faces
 * and LOADS them into the page before `renderTarget` runs, so `measureText`/wrap
 * use the bundled face on every OS — not whatever system font happens to exist.
 *
 * Empty `brand.font` → default Inter (core also falls back to "'Inter', sans-serif").
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { FONTS } from '@shotframe/fonts';
import type { BrandConfig } from '@shotframe/core';

/** The discrete weights the engine draws (caption/body); we pre-warm each one. */
export const FONT_WEIGHTS = [400, 600, 700, 800] as const;

/** A single woff2 face to inject as a `FontFace` in the page. */
export interface ResolvedFace {
  /** CSS family name to register the face under. */
  family: string;
  /** CSS `font-weight`: a single weight ('400') or a variable range ('100 900'). */
  weight: string;
  style: string;
  /**
   * Where the face lives: either a bare bundled woff2 filename (resolved from
   * `fontsDir()`), a local path (custom `fontFace.src`, served like a source
   * image), or an absolute URL (custom remote face).
   */
  file: string;
}

/** The resolved font plan for a config: the family core will use + faces to load. */
export interface FontPlan {
  /** CSS family name the engine should draw with. */
  family: string;
  /** Faces to load before the first render (empty = nothing bundled to load). */
  faces: ResolvedFace[];
}

/** Take the first family token of a CSS stack, strip quotes, trim. */
function firstFamilyToken(font: string): string {
  const first = (font.split(',')[0] ?? '').replace(/['"]/g, '').trim();
  return first;
}

/**
 * Resolve `brand.font` to a concrete font plan.
 *  - bundled family match → its woff2 face(s)
 *  - else `brand.fontFace` → the custom face (src is a path/url)
 *  - else → best-effort: the raw family, nothing to load
 */
export function resolveFont(brand: Pick<BrandConfig, 'font' | 'fontFace'>): FontPlan {
  const raw = (brand.font ?? '').trim();
  const name = firstFamilyToken(raw) || 'Inter';

  const matched = FONTS.find((f) => f.family.toLowerCase() === name.toLowerCase());
  if (matched) {
    return {
      family: matched.family,
      faces: matched.files.map((f) => ({
        family: matched.family,
        weight: f.weight,
        style: f.style,
        file: f.src,
      })),
    };
  }

  const ff = brand.fontFace;
  if (ff && ff.src) {
    const weights = ff.weights && ff.weights.length ? ff.weights : ['400 900'];
    return {
      family: ff.family,
      faces: weights.map((w) => ({ family: ff.family, weight: w, style: 'normal', file: ff.src })),
    };
  }

  // No bundled match and no custom face — best effort, nothing to load.
  return { family: raw || name, faces: [] };
}

/** Absolute on-disk dir of the bundled woff2 files (`@shotframe/fonts/fonts`). */
export function fontsDir(): string {
  // In the bundled release tarball the woff2 faces are shipped beside index.js at
  // `./assets/fonts`. Prefer that when present so a clean global install works.
  try {
    const bundled = fileURLToPath(new URL('./assets/fonts', import.meta.url));
    if (existsSync(bundled)) return bundled;
  } catch {
    /* import.meta.url not a file URL — fall through to workspace resolution */
  }
  // Dev / workspace: prefer `import.meta.resolve` (sync since Node 20.6). Fall back
  // to a CJS-style require.resolve for runtimes that don't expose it (e.g. vitest's
  // SSR realm).
  const metaResolve = (import.meta as { resolve?: (s: string) => string }).resolve;
  const pkgPath =
    typeof metaResolve === 'function'
      ? fileURLToPath(metaResolve('@shotframe/fonts/package.json'))
      : createRequire(import.meta.url).resolve('@shotframe/fonts/package.json');
  return join(dirname(pkgPath), 'fonts');
}
