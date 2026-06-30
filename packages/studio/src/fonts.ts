/**
 * Pure, browser-free helpers for the studio's font picker. Kept dependency-light
 * (no DOM, no `@shotframe/fonts` import) so they unit-test under plain vitest
 * with no jsdom. The shapes mirror the `/fonts/manifest.json` payload the CLI
 * studio server serves (the `FONTS` array from `@shotframe/fonts`).
 */

/** One shipped woff2 file of a manifest font. */
export interface ManifestFontFile {
  /** woff2 filename relative to the served `/fonts/` directory. */
  src: string;
  /** CSS `font-weight`: a single weight ('400') or a variable range ('100 900'). */
  weight: string;
  style: 'normal' | 'italic';
}

/** One font entry in `/fonts/manifest.json`. */
export interface ManifestFont {
  id: string;
  family: string;
  category: string;
  files: ManifestFontFile[];
  license: string;
}

/** A FontFace spec the studio can register + load (matches boot `fonts.faces`). */
export interface FaceSpec {
  family: string;
  /** Absolute http(s) URL or server-relative path (e.g. `/fonts/inter.woff2`). */
  url: string;
  weight: string;
  style: string;
}

/** Server path under which the studio serves bundled woff2 files. */
export const FONTS_BASE = '/fonts/';

/** Default font family when no brand font is configured. */
export const DEFAULT_FAMILY = 'Inter';

/** Sentinel `<option>` value that reveals the custom-font inputs. */
export const CUSTOM_VALUE = '__custom__';

/** Flatten every manifest font into FaceSpecs (one per shipped file). */
export function manifestFaces(manifest: ManifestFont[], base: string = FONTS_BASE): FaceSpec[] {
  const faces: FaceSpec[] = [];
  for (const font of manifest) {
    for (const file of font.files) {
      faces.push({ family: font.family, url: base + file.src, weight: file.weight, style: file.style });
    }
  }
  return faces;
}

/** Case-insensitive lookup of a manifest font by its CSS family name. */
export function findFontByFamily(manifest: ManifestFont[], family: string): ManifestFont | undefined {
  const want = family.trim().toLowerCase();
  return manifest.find((f) => f.family.toLowerCase() === want);
}

/** FaceSpecs for a single family (empty if the family is not in the manifest). */
export function facesForFamily(
  manifest: ManifestFont[],
  family: string,
  base: string = FONTS_BASE,
): FaceSpec[] {
  const font = findFontByFamily(manifest, family);
  return font ? manifestFaces([font], base) : [];
}

/**
 * Pick the family the dropdown should start on: the manifest family that matches
 * the brand's configured font (case-insensitive, returning the manifest's
 * canonical casing), else the configured font verbatim (a custom brand font),
 * else the fallback. Used to seed the picker's current selection.
 */
export function normalizeCurrentFont(
  manifest: ManifestFont[],
  current: string | undefined,
  fallback: string = DEFAULT_FAMILY,
): string {
  const trimmed = (current ?? '').trim();
  if (!trimmed) return fallback;
  const match = findFontByFamily(manifest, trimmed);
  return match ? match.family : trimmed;
}

/** True when `family` is NOT a manifest font (i.e. a custom/brand-supplied face). */
export function isCustomFamily(manifest: ManifestFont[], family: string): boolean {
  return !findFontByFamily(manifest, family);
}
