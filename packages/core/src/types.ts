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

/**
 * A few simple line-icon names the `iconGlyph` component can draw from paths.
 * Deliberately tiny + generic so a preset can compose believable app chrome.
 */
export type IconName =
  | 'chevron'
  | 'plus'
  | 'check'
  | 'search'
  | 'heart'
  | 'star'
  | 'bell'
  | 'home';

/** iOS-style status bar params. `color` tints the time + signal/wifi/battery glyphs. */
export interface StatusBarStyle {
  /** Foreground tint for the time + glyphs. */
  color: string;
  /** Clock text (defaults to a neutral placeholder time). */
  time?: string;
  /** Font family for the clock text (pass the resolved brand font). */
  family?: string;
}

/** Top navigation bar params. */
export interface NavBarStyle {
  /** Bar title text. */
  title: string;
  /** Title (and default glyph) color. */
  color: string;
  /** Optional bar fill; when omitted the bar is transparent. */
  bg?: string;
  /** Optional leading icon glyph name (e.g. `chevron`). */
  leading?: IconName;
  /** Optional trailing icon glyph name (e.g. `search`). */
  trailing?: IconName;
  /** Title alignment. Defaults to `center` (iOS) — `left` for a large-title look. */
  align?: 'center' | 'left';
  /** Font family (pass the resolved brand font). */
  family?: string;
}

/** One bottom tab item. */
export interface TabItem {
  /** Tab label. */
  label: string;
  /** Optional icon glyph name drawn above the label. */
  icon?: IconName;
  /** Whether this tab is the active one (uses `activeColor`). */
  active?: boolean;
}

/** Bottom tab bar params. */
export interface TabBarStyle {
  /** The tabs, laid out evenly across the width. */
  items: TabItem[];
  /** Inactive item color. */
  color: string;
  /** Active item color. */
  activeColor: string;
  /** Bar fill. */
  bg: string;
  /** Font family. */
  family?: string;
}

/** Rounded surface params. */
export interface CardStyle {
  /** Card fill color. */
  fill: string;
  /** Corner radius (px). */
  radius?: number;
  /** Optional 1–2px stroke color. */
  stroke?: string;
  /** Optional drop-shadow color (blur derives from card size). */
  shadow?: string;
}

/** Leading affordance for a list row: an avatar (initials) or an icon. */
export interface ListRowLeading {
  /** Leading circle/tile fill. */
  fill: string;
  /** Avatar initials (mutually exclusive with `icon`). */
  initials?: string;
  /** Initials / icon color. */
  color?: string;
  /** Icon glyph name (mutually exclusive with `initials`). */
  icon?: IconName;
}

/** A list row with an optional leading avatar/icon + trailing glyph/text. */
export interface ListRowStyle {
  /** Row title (bold). */
  title: string;
  /** Optional secondary line. */
  subtitle?: string;
  /** Optional leading avatar / icon. */
  leading?: ListRowLeading;
  /** Optional trailing icon glyph name OR literal text. */
  trailing?: IconName | string;
  /** Text colors for the row. */
  colors: { title: string; subtitle?: string; trailing?: string };
  /** Optional hairline divider color drawn at the row's bottom edge. */
  divider?: string;
  /** Font family. */
  family?: string;
}

/** Filled button params. */
export interface ButtonStyle {
  /** Button label. */
  label: string;
  /** Button fill. */
  fill: string;
  /** Label color. */
  color: string;
  /** Corner radius (defaults to a fully-rounded capsule). */
  radius?: number;
  /** Font family. */
  family?: string;
}

/** Small pill / chip params (a thin wrapper over the `pill` primitive). */
export interface ChipStyle {
  /** Chip label. */
  label: string;
  /** Chip fill. */
  fill: string;
  /** Label color. */
  color: string;
  /** Font size px (defaults from height). */
  fontPx?: number;
  /** Font weight. */
  fontWt?: number | string;
  /** Horizontal padding (auto-sizes width). */
  padX?: number;
  /** Chip height. */
  h?: number;
  /** Font family. */
  family?: string;
}

/** A heading text block. */
export interface HeadingStyle {
  /** Heading text (wrapped when `maxW` is given). */
  text: string;
  /** Font size px. */
  size: number;
  /** Font weight (defaults to 800). */
  weight?: number | string;
  /** Text color. */
  color: string;
  /** Optional wrap width. */
  maxW?: number;
  /** Font family. */
  family: string;
  /** Alignment (defaults to `left`). */
  align?: CanvasTextAlign;
}

/** A body-copy paragraph (always wrapped to `maxW`). */
export interface ParagraphStyle {
  /** Paragraph text. */
  text: string;
  /** Font size px. */
  size: number;
  /** Text color. */
  color: string;
  /** Wrap width. */
  maxW: number;
  /** Font family. */
  family: string;
  /** Font weight (defaults to 400). */
  weight?: number | string;
  /** Line height in px (defaults to size*1.4). */
  lineH?: number;
  /** Alignment (defaults to `left`). */
  align?: CanvasTextAlign;
}

/** Placeholder media rect params. */
export interface ImageBoxStyle {
  /** Base fill; a subtle vertical gradient is derived from it via alpha. */
  fill: string;
  /** Corner radius. */
  radius?: number;
  /** Optional centered icon glyph name. */
  icon?: IconName;
  /** Icon color (defaults to a translucent tint of `fill`). */
  iconColor?: string;
}

/** Circular avatar params. */
export interface AvatarStyle {
  /** Circle fill. */
  fill: string;
  /** Optional initials centered in the circle. */
  initials?: string;
  /** Initials color. */
  color?: string;
  /** Font family. */
  family?: string;
}

/** Progress bar params. */
export interface ProgressBarStyle {
  /** Progress fraction 0..1 (clamped). */
  value: number;
  /** Track (background) color. */
  track: string;
  /** Filled portion color. */
  fill: string;
  /** Bar height (defaults to a slim rounded track). */
  h?: number;
}

/** Small count / label badge params. */
export interface BadgeStyle {
  /** Numeric count (shown as-is; use with `label` omitted). */
  count?: number | string;
  /** Text label (alternative to `count`). */
  label?: string;
  /** Badge fill. */
  fill: string;
  /** Text color. */
  color: string;
  /** Font family. */
  family?: string;
}

/**
 * High-level, brand-free UI component kit — a compact vocabulary an AI agent can
 * use to REDRAW app screens without dropping to raw canvas calls. Built ON TOP of
 * the primitive toolkit; every color arrives via params/tokens (no literals).
 * Injected into the preset api as `ui` (never imported by presets).
 */
export interface UiKit {
  /** iOS-style status bar: time on the left, signal/wifi/battery glyphs on the right. */
  statusBar(g: Ctx, x: number, y: number, w: number, style: StatusBarStyle): void;
  /** Top bar with a centered/left title and optional leading/trailing glyphs. Returns its height. */
  navBar(g: Ctx, x: number, y: number, w: number, style: NavBarStyle): number;
  /** Bottom tab bar with evenly-spaced items (icon + label). */
  tabBar(g: Ctx, x: number, y: number, w: number, h: number, style: TabBarStyle): void;
  /** Rounded surface with optional stroke + shadow. */
  card(g: Ctx, x: number, y: number, w: number, h: number, style: CardStyle): void;
  /** A row with optional leading avatar/icon, title/subtitle and trailing glyph/text. */
  listRow(g: Ctx, x: number, y: number, w: number, h: number, style: ListRowStyle): void;
  /** Filled (capsule by default) button. */
  button(g: Ctx, x: number, y: number, w: number, h: number, style: ButtonStyle): void;
  /** Small auto-width pill. Returns the width used. */
  chip(g: Ctx, x: number, y: number, style: ChipStyle): number;
  /** Heading text block. Returns the y just below the block. */
  heading(g: Ctx, x: number, y: number, style: HeadingStyle): number;
  /** Wrapped body paragraph. Returns the y just below the last line. */
  paragraph(g: Ctx, x: number, y: number, style: ParagraphStyle): number;
  /** Placeholder media rect (subtle gradient + optional centered icon). */
  imageBox(g: Ctx, x: number, y: number, w: number, h: number, style: ImageBoxStyle): void;
  /** Circular avatar with optional initials. */
  avatar(g: Ctx, cx: number, cy: number, r: number, style: AvatarStyle): void;
  /** Slim rounded progress bar. */
  progressBar(g: Ctx, x: number, y: number, w: number, style: ProgressBarStyle): void;
  /** Small count/label badge (auto-width capsule). */
  badge(g: Ctx, x: number, y: number, style: BadgeStyle): void;
  /** A single simple line icon drawn from paths, centered at (cx,cy) within radius r. */
  iconGlyph(g: Ctx, cx: number, cy: number, r: number, name: IconName, color: string): void;
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
  /**
   * High-level UI component kit (brand-free, token-driven). Lets a preset redraw
   * believable app screens with a compact vocabulary instead of raw canvas calls.
   */
  ui: UiKit;
}

/**
 * A Path B preset draws a synthetic screen at the origin into a `w` x `h` area.
 * The engine translates / clips to the screen rect before calling it.
 */
export type PresetDrawFn = (ctx: Ctx, api: PresetDrawApi) => void;
