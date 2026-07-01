/**
 * The single, sync, pure compose entry point.
 *
 *   background -> frame (canvas | image | browser | none)
 *              -> cover(source image)  OR  presets[target.preset](...)
 *              -> caption
 *
 * Generalized from the source mobile render() (445-463) and the CWS
 * drawScreenshot/browserFrame path. No `document` / `window`; fonts-ready and
 * source-decode are the caller's (shell's) responsibility.
 */
import type {
  Ctx,
  StudioConfig,
  ResolvedTarget,
  SourceImageMap,
  SourceImage,
  PresetDrawFn,
  BrandConfig,
  FrameConfig,
} from './types.js';
import { rr, rb, toolkit, DEFAULT_FAMILY } from './primitives.js';
import { ui } from './ui.js';
import { drawBackground } from './background.js';
import { drawDeviceBezel, drawNotch, browserFrame, type BrowserChrome } from './frame.js';
import { drawCover } from './cover.js';
import { wrapCap, drawCaption } from './caption.js';

function resolveSource(target: ResolvedTarget, sources: SourceImageMap): SourceImage | undefined {
  if (target.source && sources[target.source]) return sources[target.source];
  if (sources[target.id]) return sources[target.id];
  return undefined;
}

function buildChrome(brand: BrandConfig, frame: FrameConfig, family: string): BrowserChrome {
  const c = brand.colors;
  return {
    body: c.chromeBody ?? c.bg,
    bar: c.chromeBar ?? c.bg,
    trafficLights: ['tomato', 'orange', 'mediumseagreen'],
    urlBar: c.chromeUrlBar ?? c.bg,
    urlText: c.muted ?? 'gray',
    url: '🔒  ' + (frame.url ?? 'example.com'),
    placeholder: c.placeholder ?? 'whitesmoke',
    family,
  };
}

/** Draw the screen body into a rect: preset (Path B) or cover(source) (Path A) or placeholder. */
function drawScreenBody(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  target: ResolvedTarget,
  brand: BrandConfig,
  source: SourceImage | undefined,
  presets: Record<string, PresetDrawFn>,
  family: string,
): void {
  const preset = target.preset ? presets[target.preset] : undefined;
  if (preset) {
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.clip();
    ctx.translate(x, y);
    preset(ctx, { w, h, brand, tokens: brand.colors, prim: toolkit, font: family, ui });
    ctx.restore();
    return;
  }
  if (source) {
    drawCover(ctx, source, x, y, w, h, r);
    return;
  }
  rb(ctx, x, y, w, h, r, brand.colors.placeholder ?? brand.colors.bg);
}

export function renderTarget(
  ctx: Ctx,
  cfg: StudioConfig,
  target: ResolvedTarget,
  sources: SourceImageMap,
  presets: Record<string, PresetDrawFn> = {},
): void {
  const W = target.size.w;
  const H = target.size.h;
  const brand = cfg.brand;
  // Resolved font family. `brand.font` is the shell-loaded bundled face (deterministic
  // across OS); fall back to the default bundled family, never silently to system fonts.
  const family = (brand.font && brand.font.trim()) || DEFAULT_FAMILY;
  const frame = target.frame ?? { type: 'none' };
  const cap = target.caption;
  const source = resolveSource(target, sources);

  // 1) background (per-target override wins)
  drawBackground(ctx, W, H, target.background ?? cfg.background);

  // 2) caption metrics (so the frame area knows where to sit)
  const pad = W * 0.075;
  const headMul = cap?.sizeMul ?? 1;
  const headPx = Math.round(W * 0.06 * headMul);
  const lineH = headPx * 1.16;
  const capBottom = cap?.position === 'bottom';
  let lines: string[] = [];
  let capH = 0;
  if (cap?.text) {
    toolkit.F(ctx, headPx, 800, family);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines = wrapCap(ctx, cap.text, W - 2 * pad);
    capH = lines.length * lineH;
  }
  const hasCap = lines.length > 0;
  const capY = capBottom ? H - capH - H * 0.055 : H * 0.075;

  const areaTop = hasCap ? (capBottom ? H * 0.06 : capY + capH + H * 0.045) : H * 0.03;
  const areaBot = hasCap ? (capBottom ? capY - H * 0.04 : H * 0.965) : H * 0.97;

  // 3) frame + body
  if (frame.type === 'canvas') {
    const radius = frame.radius ?? 0.09;
    const bezel = W * 0.012;
    const aspect = W / H;
    const scrW = Math.min(W * 0.72, (areaBot - areaTop - 2 * bezel) * aspect);
    const scrH = scrW / aspect;
    const frW = scrW + 2 * bezel;
    const frH = scrH + 2 * bezel;
    const frX = (W - frW) / 2;
    const frY = areaTop + ((areaBot - areaTop) - frH) / 2;
    const sx = frX + bezel;
    const sy = frY + bezel;
    const bezelColor = brand.colors.bezel ?? brand.colors.bg;
    const innerR = frW * radius - bezel;

    drawDeviceBezel(ctx, frX, frY, frW, frH, radius, bezelColor, W);
    ctx.save();
    rr(ctx, sx, sy, scrW, scrH, innerR);
    ctx.clip();
    drawScreenBody(ctx, sx, sy, scrW, scrH, innerR, target, brand, source, presets, family);
    ctx.restore();
    drawNotch(ctx, sx, sy, scrW, frame.island ?? 'none', bezelColor);
  } else if (frame.type === 'browser') {
    const m = W * 0.06;
    const fx = m;
    const fw = W - 2 * m;
    const fy = areaTop;
    const fh = areaBot - areaTop;
    if (target.preset) {
      // Preset draws the whole browser body itself.
      drawScreenBody(ctx, fx, fy, fw, fh, 16, target, brand, source, presets, family);
    } else {
      browserFrame(ctx, fx, fy, fw, fh, source, buildChrome(brand, frame, family));
    }
  } else if (frame.type === 'image') {
    const fx = 0;
    const fy = areaTop;
    const fw = W;
    const fh = areaBot - areaTop;
    drawScreenBody(ctx, fx, fy, fw, fh, 0, target, brand, source, presets, family);
    const frameImg = frame.src ? sources[frame.src] : undefined;
    if (frameImg) drawCover(ctx, frameImg, fx, fy, fw, fh, 0);
  } else {
    // none — bare body (e.g. feature graphic)
    drawScreenBody(ctx, 0, areaTop, W, areaBot - areaTop, 0, target, brand, source, presets, family);
  }

  // 4) caption
  if (hasCap) {
    const color = cap?.color ?? brand.colors.caption ?? 'white';
    drawCaption(ctx, lines, W, capY, headPx, lineH, color, family);
  }
}
