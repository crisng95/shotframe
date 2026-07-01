/**
 * Generic canvas primitives — the stable public toolkit.
 *
 * Ported from the source engine's two forks (mobile primitives + the
 * ExtensionStudio IIFE) and reconciled into ONE signature each:
 *   - `rr` accepts both a scalar radius and a per-corner {tl,tr,br,bl}.
 *   - `wrap` collapses mobile `wrapLines` + ExtensionStudio `wrap`.
 *   - `pill` collapses the fixed-width mobile pill + the auto-width CWS pill.
 *
 * BRAND-FREE: no color literals live here. Every color is a parameter. Structural
 * neutrals (the default font stack, named CSS colors) carry no brand meaning.
 */
import type { Ctx, Radius, Corners, PillStyle, ScrBgOpts, FigKind, CoreToolkit } from './types.js';

/** Default font stack (structural, not a brand value). Override per-call or via brand.font. */
export const DEFAULT_FONT_STACK =
  "-apple-system,'SF Pro Display','Segoe UI',Roboto,Inter,sans-serif";

/**
 * Default bundled font family. The shell loads this woff2 (via @shotframe/fonts)
 * before rendering, so it is deterministic across OS — unlike DEFAULT_FONT_STACK,
 * which resolves to whatever the render machine has installed. The trailing
 * sans-serif keeps a graceful fallback if the face somehow failed to load.
 */
export const DEFAULT_FAMILY = "'Inter', sans-serif";

/**
 * Reference phone aspect ratio (screen width / height). Used to derive the
 * phone-scale unit `S = min(w, h * PHONE_ASPECT)` handed to presets. Semantics:
 * `S` is "how wide a phone of this height would be". For phone targets (aspect
 * below this threshold) `S === w`, so type/radii are unchanged; for wider tablet
 * / iPad targets `S < w`, which bounds type and round shapes while positions and
 * containers keep using `w`/`h` to fill the frame edge-to-edge (no center column).
 * A structural layout constant, not a brand value.
 */
export const PHONE_ASPECT = 0.58;

function corners(r: Radius, w: number, h: number): Corners {
  if (typeof r === 'number') {
    const rad = Math.min(r, w / 2, h / 2);
    return { tl: rad, tr: rad, br: rad, bl: rad };
  }
  return r;
}

/** Build a rounded-rect path. Union of mobile `rr` + ExtensionStudio `roundRect`. */
export function rr(g: Ctx, x: number, y: number, w: number, h: number, r: Radius): void {
  const c = corners(r, w, h);
  g.beginPath();
  g.moveTo(x + c.tl, y);
  g.lineTo(x + w - c.tr, y);
  g.arcTo(x + w, y, x + w, y + c.tr, c.tr);
  g.lineTo(x + w, y + h - c.br);
  g.arcTo(x + w, y + h, x + w - c.br, y + h, c.br);
  g.lineTo(x + c.bl, y + h);
  g.arcTo(x, y + h, x, y + h - c.bl, c.bl);
  g.lineTo(x, y + c.tl);
  g.arcTo(x, y, x + c.tl, y, c.tl);
  g.closePath();
}

/** Filled rounded rect. */
export function rb(g: Ctx, x: number, y: number, w: number, h: number, r: Radius, c: string): void {
  rr(g, x, y, w, h, r);
  g.fillStyle = c;
  g.fill();
}

/** Stroked rounded rect. */
export function rs(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: Radius,
  c: string,
  lw?: number,
): void {
  g.lineWidth = lw || 1;
  g.strokeStyle = c;
  rr(g, x, y, w, h, r);
  g.stroke();
}

/** Set a weighted font. */
export function F(g: Ctx, px: number, wt?: number | string, family: string = DEFAULT_FONT_STACK): void {
  g.font = `${wt || 600} ${px}px ${family}`;
}

/** Draw text. */
export function tx(
  g: Ctx,
  s: string,
  x: number,
  y: number,
  px: number,
  wt: number | string,
  c: string,
  al: CanvasTextAlign = 'left',
  family: string = DEFAULT_FONT_STACK,
): void {
  F(g, px, wt, family);
  g.fillStyle = c;
  g.textAlign = al;
  g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
}

/**
 * Word-wrap to `maxW`. If `px` is given the font is set first (mobile behavior);
 * otherwise the caller's current font is measured (ExtensionStudio behavior).
 */
export function wrap(
  g: Ctx,
  t: string,
  maxW: number,
  px?: number,
  wt?: number | string,
  family?: string,
): string[] {
  if (px != null) F(g, px, wt, family);
  const out: string[] = [];
  t.split(' ').forEach((w) => {
    if (!out.length) {
      out.push(w);
      return;
    }
    const tt = out[out.length - 1] + ' ' + w;
    if (g.measureText(tt).width > maxW) out.push(w);
    else out[out.length - 1] = tt;
  });
  return out;
}

/** Alias kept for preset authors / source parity. */
export const wrapLines = wrap;

/**
 * Rounded pill. Union of the two source pills:
 *   - fixed width: pass `w`; text is centered (mobile baseline y + h*0.54).
 *   - auto width: pass `w = null`; width is measured from `text` + `padX*2`,
 *     text is left-aligned (CWS baseline y + h/2 + 0.5).
 * Returns the width actually used.
 */
export function pill(g: Ctx, x: number, y: number, w: number | null, h: number, style: PillStyle): number {
  const { fill, text, color, fontPx, fontWt = 800, padX = 0, align = 'center', family } = style;
  let pw = w ?? 0;
  if (w == null) {
    if (fontPx != null) F(g, fontPx, fontWt, family);
    pw = g.measureText(text ?? '').width + padX * 2;
  }
  rb(g, x, y, pw, h, h / 2, fill);
  if (text) {
    if (fontPx != null) F(g, fontPx, fontWt, family);
    g.fillStyle = color ?? 'white';
    g.textBaseline = 'middle';
    if (align === 'left') {
      g.textAlign = 'left';
      g.fillText(text, x + padX, y + h / 2 + 0.5);
    } else {
      g.textAlign = 'center';
      g.fillText(text, x + pw / 2, y + h * 0.54);
    }
  }
  return pw;
}

/** iOS-style status bar (clock + battery). Color is supplied by the caller. */
export function sbar(g: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  tx(g, '9:41', x + w * 0.07, y + h * 0.045, w * 0.038, 700, color, 'left');
  rb(g, x + w - w * 0.135, y + h * 0.022, w * 0.058, h * 0.013, h * 0.004, color);
  rs(g, x + w - w * 0.075, y + h * 0.022, h * 0.013 * 0.5, h * 0.013, h * 0.002, color, 1);
}

/** Generic screen background: linear gradient + optional radial glow. Colors via opts. */
export function scrBg(g: Ctx, x: number, y: number, w: number, h: number, opts: ScrBgOpts): void {
  const { bg, glow, radial } = opts;
  const lg = g.createLinearGradient(x, y, x, y + h);
  lg.addColorStop(0, bg[0]);
  lg.addColorStop(1, bg[1]);
  g.fillStyle = lg;
  g.fillRect(x, y, w, h);
  if (glow) {
    const cy = radial ? y + h * 0.0 : y + h * 0.12;
    const rd = g.createRadialGradient(x + w * 0.5, cy, 0, x + w * 0.5, cy, w);
    rd.addColorStop(0, glow);
    rd.addColorStop(1, 'transparent');
    g.fillStyle = rd;
    g.fillRect(x, y, w, h);
  }
}

/** Generic shape helper. `color` fills; `strokeColor` (or `color`) strokes outlines. */
export function fig(
  g: Ctx,
  x: number,
  y: number,
  s: number,
  kind: FigKind,
  color: string,
  strokeColor?: string,
): void {
  if (kind === 'diamond') {
    g.save();
    g.translate(x + s / 2, y + s / 2);
    g.rotate(Math.PI / 4);
    rb(g, -s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.12, color);
    g.restore();
  } else if (kind === 'circle') {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x + s / 2, y + s / 2, s * 0.42, 0, 7);
    g.fill();
  } else if (kind === 'outline') {
    rs(g, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.16, strokeColor ?? color, Math.max(1, s * 0.07));
  } else {
    rb(g, x, y, s, s, s * 0.16, color);
  }
}

/**
 * Apply an alpha to a color. `#rgb` / `#rrggbb` -> `rgba(...)`. Non-hex inputs
 * (named colors, existing rgba, `transparent`) pass through unchanged.
 */
export function withAlpha(color: string, a: number): string {
  if (color[0] !== '#') return color;
  const hexBody = color.slice(1);
  let r: number;
  let gg: number;
  let b: number;
  if (hexBody.length === 3) {
    r = parseInt(hexBody[0] + hexBody[0], 16);
    gg = parseInt(hexBody[1] + hexBody[1], 16);
    b = parseInt(hexBody[2] + hexBody[2], 16);
  } else {
    r = parseInt(hexBody.slice(0, 2), 16);
    gg = parseInt(hexBody.slice(2, 4), 16);
    b = parseInt(hexBody.slice(4, 6), 16);
  }
  return `rgba(${r},${gg},${b},${a})`;
}

/** The stable public primitive toolkit, bundled for preset authors. */
export const toolkit: CoreToolkit = {
  rr,
  rb,
  rs,
  F,
  tx,
  wrap,
  wrapLines,
  pill,
  sbar,
  scrBg,
  fig,
  withAlpha,
};
