/**
 * Public types for @shotframe/core (Full-DOM HTML engine).
 *
 * The engine is a pure, isomorphic HTML/CSS string builder — it never touches
 * `document`, `window`, or a canvas. `renderAsset` returns the HTML for one
 * store asset; the shell (CLI via Playwright, or the studio) rasterizes it.
 *
 * NOTE: this file carries no rendering code, only type shapes. Default color
 * values are NEVER baked into the engine; they always arrive via config / brand.
 */

/** Per-corner radius (px). */
export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

/** Union radius: a single number (all corners) or an explicit per-corner set. */
export type Radius = number | Corners;

/** Map of source id -> a URL the browser can load (`<img src>` / CSS `url()`). */
export type SourceUrlMap = Record<string, string>;

/** Brand surface: replaces every hardcoded name / color / font. */
export interface BrandConfig {
  /** Display name. */
  name: string;
  /** Logo path or URL (consumed by presets, not core). */
  logo?: string;
  /**
   * Color palette. `primary`, `accent` and `bg` are guaranteed; any number of
   * additional named tokens may be supplied (e.g. `bezel`, `muted`, `placeholder`,
   * `caption`, `chromeBar`, `chromeBody`, `chromeUrlBar`).
   */
  colors: { primary: string; accent: string; bg: string; [k: string]: string };
  /** Font-family stack / family name (the shell loads the actual face). */
  font?: string;
  /**
   * Optional custom font face, for a family NOT bundled in `@shotframe/fonts`.
   * `src` is a path (resolved relative to the config file) or URL to a woff2/ttf;
   * the shell serves & loads it before render so metrics stay deterministic.
   */
  fontFace?: { family: string; src: string; weights?: string[] };
}

/** Background generalizes the mobile center-radial glow and the CWS corner-vignette. */
export interface BackgroundConfig {
  type: 'gradient' | 'solid' | 'image';
  /** Glow placement. `center-radial` = mobile; `corner-vignette` = CWS. */
  glowStyle?: 'center-radial' | 'corner-vignette';
  /** Gradient color stops. */
  stops?: string[];
  /** Radial glow color. */
  glow?: string;
  /** Solid fill color. */
  color?: string;
  /** Background image source id. */
  image?: string;
}

/**
 * Frame: four types — CSS device bezel, image PNG bezel, browser chrome, or bare.
 * `type: 'canvas'` is kept for config back-compat; it now selects the CSS device
 * frame (bezel + notch), not a literal canvas.
 */
export interface FrameConfig {
  type: 'canvas' | 'image' | 'browser' | 'none';
  /** Corner radius as a fraction of frame width (device type). */
  radius?: number;
  /** Notch variant (device type). */
  island?: 'island' | 'hole' | 'none';
  /** Frame PNG source id (image type). */
  src?: string;
  /** URL-bar text (browser type). */
  url?: string;
}

export type Store = 'appstore' | 'play' | 'chrome' | 'email';

export interface CaptionConfig {
  text: string;
  position?: 'top' | 'bottom';
  /** Headline size multiplier. */
  sizeMul?: number;
  /** Caption text color (defaults to the brand `caption` token). */
  color?: string;
}

export interface OutputConfig {
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface Target {
  store: Store;
  /** e.g. 'iphone69' | 'screenshot-1' | 'feature-graphic'. */
  id: string;
  /** Exact store pixels. */
  size: { w: number; h: number };
  frame?: FrameConfig;
  /** Per-target background override (mobile glow vs CWS corner glow differ). */
  background?: BackgroundConfig;
  caption?: CaptionConfig;
  output?: OutputConfig;
  /** Source id of the real screenshot (Path A). */
  source?: string;
  /** Optional preset id (Path B synthetic HTML screen). */
  preset?: string;
  /**
   * Fixed-resolution control for a Path B preset (see `screen.ts`). The preset is
   * authored at this logical width and uniformly scaled to fill the screen rect,
   * so it never squishes across aspect ratios.
   *   - omitted        → default: `DESIGN_WIDTH` (390) for device (`canvas`) frames,
   *                      raw screen rect for browser/other frames.
   *   - `{ width: N }` → author at logical width `N`, scale to fill.
   *   - `false`        → disable normalization; author at the raw screen rect.
   */
  design?: { width: number } | false;
}

/** A target with its frame guaranteed resolved. */
export interface ResolvedTarget extends Target {
  frame: FrameConfig;
}

export interface PresetDef {
  id: string;
  /** Module specifier the SHELL resolves to an HtmlPresetFn. Core never imports it. */
  module: string;
}

export interface StudioConfig {
  brand: BrandConfig;
  background: BackgroundConfig;
  targets: Target[];
  presets?: PresetDef[];
  output?: { dir: string; format?: 'png' | 'jpeg'; quality?: number };
}

// --- HTML component kit (brand-free, token-driven) -------------------------

/** A few simple inline-SVG icon names the `icon` helper understands. */
export type IconName =
  | 'chevron'
  | 'plus'
  | 'check'
  | 'search'
  | 'heart'
  | 'star'
  | 'bell'
  | 'home';

/**
 * High-level, brand-free UI component kit that returns HTML strings — a compact
 * vocabulary an author (or an AI agent) can use to build believable app screens
 * without hand-writing every div. Every color arrives via params (no literals).
 * Injected into the preset api as `ui` (never imported by presets).
 */
export interface HtmlUiKit {
  /** HTML-escape helper (so presets can safely interpolate user text). */
  esc(s: string): string;
  /** Apply alpha to a hex color -> rgba. */
  withAlpha(color: string, a: number): string;
  /** iOS-style status bar row (time left, signal/wifi/battery right). */
  statusBar(style: { color: string; time?: string }): string;
  /** Inline SVG line icon at `size` px, stroked with `color`. */
  icon(name: IconName, size: number, color: string): string;
  /** A rounded surface (card) wrapping `inner` HTML. */
  card(inner: string, style: { fill: string; radius?: number; pad?: number; stroke?: string; shadow?: string }): string;
  /** A filled capsule button. */
  button(label: string, style: { fill: string; color: string; radius?: number; pad?: string; fontPx?: number }): string;
  /** A small auto-width chip / pill. */
  chip(label: string, style: { fill: string; color: string; fontPx?: number; padX?: number; h?: number }): string;
  /** Bottom tab bar (evenly spaced items). */
  tabBar(items: { label: string; icon?: IconName; active?: boolean }[], style: { color: string; activeColor: string; bg: string; h: number }): string;
}

/** The args handed to a Path B HTML preset. */
export interface HtmlPresetArgs {
  /** Screen (inner) width in px. */
  w: number;
  /** Screen (inner) height in px. */
  h: number;
  brand: BrandConfig;
  /** Brand color tokens, available by name. */
  tokens: Record<string, string>;
  /** Resolved font family (already loaded by the shell). */
  font: string;
  /** ref -> URL for images the preset embeds (real photos, icons, logo). */
  assets: SourceUrlMap;
  /** High-level HTML component kit (brand-free, token-driven). */
  ui: HtmlUiKit;
}

/**
 * A Path B preset returns the INNER HTML of an app screen sized `w` x `h`.
 * It MUST be self-contained (only its injected args) — the shell may serialize
 * it (`Function.prototype.toString`) to run in the studio's browser realm.
 */
export type HtmlPresetFn = (a: HtmlPresetArgs) => string;

/** Options for `renderAsset`. */
export interface RenderAssetOptions {
  /** Path B presets by id (live functions). */
  presets?: Record<string, HtmlPresetFn>;
  /** Source ref -> URL map (real screenshots, frame PNGs, bg images, preset assets). */
  sources?: SourceUrlMap;
  /** Resolved font family to apply as the asset's base font. */
  family?: string;
}
