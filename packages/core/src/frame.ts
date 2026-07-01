/**
 * Frame chrome → HTML/CSS. Faithful port of the old canvas frame drawers:
 *   - device bezel + notch  (type 'canvas')  — metallic rail, dark rim, hairline
 *   - browser chrome        (type 'browser')  — traffic lights + url bar
 *   - image PNG bezel       (type 'image')    — screen fills, PNG overlaid
 *   - none                  (type 'none')     — bare screen body
 * `screenHtml` is the already-built screen body; the frame positions/clips it.
 * All colors arrive from the caller (brand tokens); no literals except the
 * structural light overlays (rgba white/black) that read as metal + glass.
 */
import type { FrameConfig, BrandConfig, SourceUrlMap } from './types.js';
import { style, px, div, esc } from './css.js';

export interface FrameGeom {
  areaTop: number;
  areaBot: number;
  w: number;
  h: number;
}

/** Builds the inner screen HTML for a given screen rect (sw × sh px). */
export type RenderScreen = (sw: number, sh: number) => string;

/** Device bezel + notch (type 'canvas'). Returns the framed screen HTML. */
function deviceFrame(
  cfg: FrameConfig,
  renderScreen: RenderScreen,
  g: FrameGeom,
  bezelColor: string,
): string {
  const { w: W, areaTop, areaBot } = g;
  const bezel = W * 0.012;
  const aspect = W / g.h;
  const scrW = Math.min(W * 0.72, (areaBot - areaTop - 2 * bezel) * aspect);
  const scrH = scrW / aspect;
  const frW = scrW + 2 * bezel;
  const frH = scrH + 2 * bezel;
  const frX = (W - frW) / 2;
  const frY = areaTop + (areaBot - areaTop - frH) / 2;
  const sx = frX + bezel;
  const sy = frY + bezel;
  const radius = cfg.radius ?? 0.09;
  const r = frW * radius;
  const innerR = Math.max(0, r - bezel);
  const rail = Math.max(2, W * 0.0026);

  // outer bezel: dark body + drop shadow + bright metallic inset rail
  const bezelDiv = div(
    style({
      position: 'absolute',
      left: px(frX),
      top: px(frY),
      width: px(frW),
      height: px(frH),
      background: bezelColor,
      'border-radius': px(r),
      'box-shadow': `0 ${px(W * 0.02)} ${px(W * 0.05)} rgba(0,0,0,.5), inset 0 0 0 ${px(rail)} rgba(255,255,255,.55)`,
    }),
    // inset dark rim so the rail reads as a raised band
    div(
      style({
        position: 'absolute',
        inset: px(W * 0.004),
        'border-radius': px(Math.max(0, r - W * 0.004)),
        'box-shadow': 'inset 0 0 0 1px rgba(0,0,0,.45)',
      }),
    ),
  );

  // screen (clipped) + hairline overlay + notch
  const screen = div(
    style({
      position: 'absolute',
      left: px(sx),
      top: px(sy),
      width: px(scrW),
      height: px(scrH),
      'border-radius': px(innerR),
      overflow: 'hidden',
    }),
    renderScreen(scrW, scrH),
  );

  const hairline = div(
    style({
      position: 'absolute',
      left: px(sx),
      top: px(sy),
      width: px(scrW),
      height: px(scrH),
      'border-radius': px(innerR),
      'box-shadow': 'inset 0 0 0 1px rgba(255,255,255,.10)',
      'pointer-events': 'none',
    }),
  );

  let notch = '';
  if (cfg.island === 'island') {
    const iw = scrW * 0.305;
    const ih = scrW * 0.078;
    notch = div(
      style({
        position: 'absolute',
        left: px(sx + scrW / 2 - iw / 2),
        top: px(sy + scrW * 0.03),
        width: px(iw),
        height: px(ih),
        background: bezelColor,
        'border-radius': px(ih / 2),
      }),
    );
  } else if (cfg.island === 'hole') {
    const d = scrW * 0.04;
    notch = div(
      style({
        position: 'absolute',
        left: px(sx + scrW / 2 - d / 2),
        top: px(sy + scrW * 0.045 - d / 2),
        width: px(d),
        height: px(d),
        background: bezelColor,
        'border-radius': '50%',
      }),
    );
  }

  return bezelDiv + screen + hairline + notch;
}

/** Browser chrome (type 'browser'). CWS-oriented fixed pixel constants. */
function browserFrame(
  cfg: FrameConfig,
  renderScreen: RenderScreen,
  g: FrameGeom,
  brand: BrandConfig,
  family: string,
): string {
  const { w: W, areaTop, areaBot } = g;
  const m = W * 0.06;
  const fx = m;
  const fw = W - 2 * m;
  const fy = areaTop;
  const fh = areaBot - areaTop;
  const c = brand.colors;
  const lights = ['tomato', 'orange', 'mediumseagreen'];

  const dots = lights
    .map(
      (col, i) =>
        `<div style="${style({ position: 'absolute', left: px(20 + i * 22), top: px(14), width: '12px', height: '12px', 'border-radius': '50%', background: col })}"></div>`,
    )
    .join('');

  const bar = div(
    style({
      position: 'absolute',
      left: '0',
      top: '0',
      width: px(fw),
      height: '40px',
      background: c.chromeBar ?? c.bg,
      'border-radius': '16px 16px 0 0',
    }),
    dots +
      div(
        style({
          position: 'absolute',
          left: '92px',
          top: '10px',
          width: px(fw - 200),
          height: '20px',
          'border-radius': '10px',
          background: c.chromeUrlBar ?? c.bg,
          color: c.muted ?? 'gray',
          'font-family': `'${family}',sans-serif`,
          'font-size': '11px',
          'line-height': '20px',
          'padding-left': '12px',
          'box-sizing': 'border-box',
          'white-space': 'nowrap',
          overflow: 'hidden',
        }),
        esc('🔒  ' + (cfg.url ?? 'example.com')),
      ),
  );

  const body = div(
    style({
      position: 'absolute',
      left: '0',
      top: '40px',
      width: px(fw),
      height: px(fh - 40),
      background: c.placeholder ?? c.bg,
      'border-radius': '0 0 16px 16px',
      overflow: 'hidden',
    }),
    renderScreen(fw, fh - 40),
  );

  return div(
    style({
      position: 'absolute',
      left: px(fx),
      top: px(fy),
      width: px(fw),
      height: px(fh),
      'border-radius': '16px',
      background: c.chromeBody ?? c.bg,
      'box-shadow': '0 24px 50px rgba(0,0,0,.5)',
    }),
    bar + body,
  );
}

/** Compose the frame layer for a target. `renderScreen(sw,sh)` builds the body. */
export function frameLayer(
  cfg: FrameConfig,
  renderScreen: RenderScreen,
  g: FrameGeom,
  brand: BrandConfig,
  family: string,
  sources: SourceUrlMap = {},
): string {
  const bezelColor = brand.colors.bezel ?? brand.colors.bg;

  if (cfg.type === 'canvas') return deviceFrame(cfg, renderScreen, g, bezelColor);
  if (cfg.type === 'browser') return browserFrame(cfg, renderScreen, g, brand, family);

  // image / none: screen fills the whole area
  const area = div(
    style({
      position: 'absolute',
      left: '0',
      top: px(g.areaTop),
      width: px(g.w),
      height: px(g.areaBot - g.areaTop),
      overflow: 'hidden',
    }),
    renderScreen(g.w, g.areaBot - g.areaTop),
  );

  if (cfg.type === 'image') {
    const url = cfg.src ? sources[cfg.src] : undefined;
    const overlay = url
      ? `<img src="${url}" style="${style({ position: 'absolute', left: '0', top: px(g.areaTop), width: px(g.w), height: px(g.areaBot - g.areaTop), 'object-fit': 'cover', 'pointer-events': 'none' })}" />`
      : '';
    return area + overlay;
  }

  return area; // none
}
