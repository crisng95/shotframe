/**
 * The single, pure, isomorphic compose entry point.
 *
 *   #asset (W×H) = background layer + frame(screen body) + caption layer
 *
 * Returns an HTML string. Runs unchanged in Node (CLI → Playwright setContent)
 * and in the browser (studio → innerHTML). No `document`, no canvas. The shell
 * is responsible for loading the brand font before it rasterizes the result.
 */
import type { StudioConfig, ResolvedTarget, RenderAssetOptions } from './types.js';
import { style, px, div } from './css.js';
import { backgroundLayer } from './background.js';
import { captionMetrics, captionLayer } from './caption.js';
import { frameLayer } from './frame.js';
import { screenBody } from './screen.js';
import { ui } from './ui.js';

const DEFAULT_FAMILY = 'Inter';

/** A scoped reset so the asset renders identically regardless of host page. */
const RESET =
  '<style>#asset,#asset *{box-sizing:border-box;margin:0;padding:0}' +
  '#asset{-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}' +
  '#asset img{display:block}</style>';

/** Build the `#asset` HTML for one target. */
export function renderAsset(
  cfg: StudioConfig,
  target: ResolvedTarget,
  opts: RenderAssetOptions = {},
): string {
  const W = target.size.w;
  const H = target.size.h;
  const brand = cfg.brand;
  const family = (opts.family && opts.family.trim()) || (brand.font && brand.font.trim()) || DEFAULT_FAMILY;
  const sources = opts.sources ?? {};
  const presets = opts.presets ?? {};
  const frame = target.frame ?? { type: 'none' as const };
  const bg = target.background ?? cfg.background;

  const m = captionMetrics(target.caption, W, H);

  const bgHtml = backgroundLayer(bg, W, H, sources);
  const frameHtml = frameLayer(
    frame,
    (sw, sh) => screenBody(target, brand, sw, sh, family, presets, sources, ui),
    { areaTop: m.areaTop, areaBot: m.areaBot, w: W, h: H },
    brand,
    family,
    sources,
  );
  const capColor = target.caption?.color ?? brand.colors.caption ?? 'white';
  const capHtml = captionLayer(m, W, capColor, family);

  const asset = div(
    style({
      position: 'relative',
      width: px(W),
      height: px(H),
      overflow: 'hidden',
      background: brand.colors.bg,
      'font-family': `'${family}',-apple-system,'Segoe UI',Roboto,sans-serif`,
    }),
    bgHtml + frameHtml + capHtml,
    'id="asset"',
  );

  return RESET + asset;
}
