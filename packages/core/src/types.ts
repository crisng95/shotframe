/**
 * Public types for @shotframe/core.
 *
 * These define the config surface and the engine signatures. Per the plan, all
 * TS interfaces live here in M1 because `renderTarget`'s signature depends on them.
 *
 * NOTE: this file is intentionally excluded from the "no hex color literals" rule
 * (it carries no rendering code, only type shapes). Default color values are NEVER
 * baked into the engine; they always arrive through the config / brand object.
 */

/** A 2D drawing context. The engine never touches `document` or `window`. */
export type Ctx = CanvasRenderingContext2D;

/** Per-corner radius. */
export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

/** Union radius: a single number (all corners) or an explicit per-corner set. */
export type Radius = number | Corners;

/** An already-decoded image the engine can draw. The shell decodes these first. */
export type SourceImage =
  | ImageBitmap
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas;

/** Map of source id -> decoded image. */
export type SourceImageMap = Record<string, SourceImage>;

/** Shape kinds understood by the generic `fig` primitive. */
export type FigKind = 'square' | 'diamond' | 'circle' | 'outline';

/** Options for the generic screen-background primitive (`scrBg`). */
export interface ScrBgOpts {
  /** Two linear-gradient stops [top, bottom]. */
  bg: [string, string];
  /** Optional radial glow color. */
  glow?: string;
  /** When true, the glow is centered at the top edge (vs. slightly below). */
  radial?: boolean;
}

/** Style bag for the union `pill` primitive. */
export interface PillStyle {
  /** Pill fill color. */
  fill: string;
  /** Optional label text. */
  text?: string;
  /** Text color. */
  color?: string;
  /** Font size in px (required when auto-sizing width from text). */
  fontPx?: number;
  /** Font weight. */
  fontWt?: number | string;
  /** Horizontal text padding; also used to auto-size width when `w` is null. */
  padX?: number;
  /** Text alignment within the pill. */
  align?: 'center' | 'left';
  /** Font family override. */
  family?: string;
}

/**
 * The stable public primitive toolkit. Exported so preset authors can build
 * synthetic screens with the exact same primitives the engine uses.
 */
export interface CoreToolkit {
  rr(g: Ctx, x: number, y: number, w: number, h: number, r: Radius): void;
  rb(g: Ctx, x: number, y: number, w: number, h: number, r: Radius, c: string): void;
  rs(g: Ctx, x: number, y: number, w: number, h: number, r: Radius, c: string, lw?: number): void;
  F(g: Ctx, px: number, wt?: number | string, family?: string): void;
  tx(
    g: Ctx,
    s: string,
    x: number,
    y: number,
    px: number,
    wt: number | string,
    c: string,
    al?: CanvasTextAlign,
    family?: string,
  ): void;
  wrap(g: Ctx, t: string, maxW: number, px?: number, wt?: number | string, family?: string): string[];
  wrapLines(g: Ctx, t: string, maxW: number, px?: number, wt?: number | string, family?: string): string[];
  pill(g: Ctx, x: number, y: number, w: number | null, h: number, style: PillStyle): number;
  sbar(g: Ctx, x: number, y: number, w: number, h: number, color: string): void;
  scrBg(g: Ctx, x: number, y: number, w: number, h: number, opts: ScrBgOpts): void;
  fig(g: Ctx, x: number, y: number, s: number, kind: FigKind, color: string, strokeColor?: string): void;
  withAlpha(color: string, a: number): string;
}

/** Brand surface: replaces every hardcoded name / color / font that used to live in the engine. */
export interface BrandConfig {
  /** Display name (replaces brand-name literals). */
  name: string;
  /** Logo path or URL (consumed by the preset / brand layer, not core). */
  logo?: string;
  /**
   * Color palette. `primary`, `accent` and `bg` are guaranteed; any number of
   * additional named tokens may be supplied (e.g. `bezel`, `muted`, `placeholder`,
   * `caption`, `chromeBar`, `chromeBody`, `chromeUrlBar`).
   */
  colors: { primary: string; accent: string; bg: string; [k: string]: string };
  /** Font-family stack. */
  font?: string;
  /**
   * Optional custom font face, for a family NOT bundled in `@shotframe/fonts`.
   * `src` is a path (resolved relative to the config file) or URL to a woff2/ttf;
   * the shell serves & loads it before render so wrapping stays deterministic.
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

/** Frame: four types — drawn device bezel, image PNG bezel, browser chrome, or bare. */
export interface FrameConfig {
  type: 'canvas' | 'image' | 'browser' | 'none';
  /** Corner radius as a fraction of frame width (canvas type). */
  radius?: number;
  /** Notch variant (canvas type). */
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
  /** Optional preset id (Path B synthetic draw). */
  preset?: string;
}

/** A target with its frame guaranteed resolved. */
export interface ResolvedTarget extends Target {
  frame: FrameConfig;
}

export interface PresetDef {
  id: string;
  /** Module specifier the SHELL resolves to a PresetDrawFn and injects. Core never imports it. */
  module: string;
}

export interface StudioConfig {
  brand: BrandConfig;
  background: BackgroundConfig;
  targets: Target[];
  presets?: PresetDef[];
  output?: { dir: string; format?: 'png' | 'jpeg'; quality?: number };
}

/** API handed to a Path B preset draw function. */
export interface PresetDrawApi {
  w: number;
  h: number;
  brand: BrandConfig;
  /** Remap of brand color tokens, available by name. */
  tokens: Record<string, string>;
  /** The stable core primitive toolkit. */
  prim: CoreToolkit;
  /** Resolved font family (pass to `prim.F`/`prim.tx` so preset text matches the brand font). */
  font: string;
}

/**
 * A Path B preset draws a synthetic screen at the origin into a `w` x `h` area.
 * The engine translates / clips to the screen rect before calling it.
 */
export type PresetDrawFn = (ctx: Ctx, api: PresetDrawApi) => void;
