/**
 * Frame chrome. Three drawn frame styles live here:
 *   - device bezel + notch (canvas type)   — ported from render() 459-462
 *   - browser chrome (browser type)         — ported from browserFrame() 614-623,
 *     FRAME CHROME ONLY (traffic lights + url bar + rounded body). The original
 *     synthetic mock-website body (the demo content) is intentionally dropped:
 *     with no image, the body is a neutral placeholder fill.
 * All colors are supplied by the caller (no brand literals here).
 */
import type { Ctx, SourceImage } from './types.js';
import { rr, rb, rs, F } from './primitives.js';
import { drawCover } from './cover.js';

/**
 * Draw the rounded device bezel. Layered to read as a real handset rather than a
 * generic slab: a thin bright metallic rail at the outer edge (the titanium/alloy
 * band that catches light — the defining iPhone tell vs. an Android look-alike),
 * the dark bezel body, and a faint inner hairline where the glass meets the frame.
 * The bright/dark strokes are structural light overlays (rgba), not brand colors.
 */
export function drawDeviceBezel(
  ctx: Ctx,
  frX: number,
  frY: number,
  frW: number,
  frH: number,
  radius: number,
  bezelColor: string,
  W: number,
): void {
  const r = frW * radius;
  // 1) dark bezel body + drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)';
  ctx.shadowBlur = W * 0.05;
  ctx.shadowOffsetY = W * 0.02;
  rb(ctx, frX, frY, frW, frH, r, bezelColor);
  ctx.restore();
  // 2) outer metallic rail — bright thin rim at the very edge
  rs(ctx, frX, frY, frW, frH, r, 'rgba(255,255,255,.55)', Math.max(2, W * 0.0026));
  // 3) a slightly inset darker rim so the rail reads as a raised metal band
  const g = W * 0.004;
  rs(ctx, frX + g, frY + g, frW - 2 * g, frH - 2 * g, r - g, 'rgba(0,0,0,.45)', Math.max(1, W * 0.0016));
  // 4) faint inner hairline at the glass edge
  const b = W * 0.011;
  rs(ctx, frX + b, frY + b, frW - 2 * b, frH - 2 * b, r - b, 'rgba(255,255,255,.10)', Math.max(1, W * 0.0012));
}

/** Draw the notch / cutout for the given island variant. */
export function drawNotch(
  ctx: Ctx,
  sx: number,
  sy: number,
  scrW: number,
  island: 'island' | 'hole' | 'none',
  color: string,
): void {
  if (island === 'island') {
    // Dynamic Island: a slim pill, sitting close to the top edge.
    const iw = scrW * 0.305;
    const ih = scrW * 0.078;
    rb(ctx, sx + scrW / 2 - iw / 2, sy + scrW * 0.03, iw, ih, ih / 2, color);
  } else if (island === 'hole') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx + scrW / 2, sy + scrW * 0.045, scrW * 0.02, 0, 7);
    ctx.fill();
  }
}

/** Colors + text for the browser chrome. */
export interface BrowserChrome {
  /** Frame body / drop-shadow fill (behind the rounded body). */
  body: string;
  /** Top bar fill. */
  bar: string;
  /** Three traffic-light dot colors. */
  trafficLights: [string, string, string];
  /** URL-bar fill. */
  urlBar: string;
  /** URL text color. */
  urlText: string;
  /** URL text content. */
  url: string;
  /** Neutral placeholder fill when no image is supplied. */
  placeholder: string;
  /** Font family for the URL-bar text (defaults to the engine default stack). */
  family?: string;
}

/**
 * Draw browser chrome wrapping `droppedImg` via cover-fit. The pixel constants
 * match the source's CWS chrome (designed for fixed CWS sizes). With no image,
 * the body is filled with a neutral placeholder (NOT the old mock website).
 */
export function browserFrame(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  droppedImg: SourceImage | undefined,
  chrome: BrowserChrome,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  rr(ctx, x, y, w, h, 16);
  ctx.fillStyle = chrome.body;
  ctx.fill();
  ctx.restore();

  rr(ctx, x, y, w, 40, { tl: 16, tr: 16, br: 0, bl: 0 });
  ctx.fillStyle = chrome.bar;
  ctx.fill();

  chrome.trafficLights.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(x + 26 + i * 22, y + 20, 6, 0, 7);
    ctx.fillStyle = c;
    ctx.fill();
  });

  rr(ctx, x + 92, y + 10, w - 200, 20, 10);
  ctx.fillStyle = chrome.urlBar;
  ctx.fill();
  ctx.fillStyle = chrome.urlText;
  F(ctx, 11, 500, chrome.family);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(chrome.url, x + 104, y + 21);

  const bodyY = y + 40;
  const bodyH = h - 40;
  if (droppedImg) {
    drawCover(ctx, droppedImg, x, bodyY, w, bodyH, { tl: 0, tr: 0, br: 16, bl: 16 });
    return;
  }
  ctx.save();
  rr(ctx, x, bodyY, w, bodyH, { tl: 0, tr: 0, br: 16, bl: 16 });
  ctx.clip();
  ctx.fillStyle = chrome.placeholder;
  ctx.fillRect(x, bodyY, w, bodyH);
  ctx.restore();
}
