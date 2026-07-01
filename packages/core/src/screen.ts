/**
 * Screen body: Path B (HTML preset) or Path A (real screenshot `<img>` cover)
 * or a neutral placeholder. Faithful successor to the old canvas `drawScreenBody`.
 *
 * ## Fixed-resolution + uniform scale (Path B presets)
 *
 * A preset is authored at ONE fixed logical width (`DESIGN_WIDTH`, 390px = iPhone
 * logical) using natural CSS flow (flexbox column, gaps, `flex:1` spacers). The
 * engine then wraps the preset output in a box of `DESIGN_WIDTH × logicalHeight`
 * and applies a SINGLE uniform `transform: scale()` so it fills the real screen
 * rect exactly. Because the scale is uniform, nothing is ever squished; because
 * the preset always sees `w === DESIGN_WIDTH`, its px/font constants stay stable
 * across every store size — only the logical HEIGHT varies with the target aspect
 * (phone ≈ 845, Play ≈ 693, iPad ≈ 520), which a flex-column preset absorbs as
 * "fewer items on a shorter viewport" instead of overflowing or distorting.
 *
 * The normalization is applied for device (`frame.type === 'canvas'`) targets by
 * default, and can be forced/overridden/disabled per target via `target.design`.
 * Browser/CWS frames and Path A (`<img>`) are never scaled.
 */
import type { ResolvedTarget, BrandConfig, HtmlPresetFn, SourceUrlMap, HtmlUiKit } from './types.js';
import { style, px, div } from './css.js';

/** Canonical logical width a Path B preset is authored against (iPhone logical). */
export const DESIGN_WIDTH = 390;

/**
 * Decide the logical (design) width for a target's preset, or `null` to render
 * the preset at the raw screen rect (legacy / desktop / browser chrome).
 *   - `target.design === false` → disabled (raw rect)
 *   - `target.design.width`      → explicit override
 *   - device frame (`canvas`)    → default `DESIGN_WIDTH`
 *   - otherwise                  → null (raw rect)
 */
export function logicalWidthFor(target: ResolvedTarget): number | null {
  const d = target.design;
  if (d === false) return null;
  if (d && typeof d.width === 'number' && d.width > 0) return d.width;
  if (target.frame?.type === 'canvas') return DESIGN_WIDTH;
  return null;
}

/** Resolve a real-screenshot URL: explicit `source` id first, then the target id. */
function resolveSourceUrl(target: ResolvedTarget, sources: SourceUrlMap): string | undefined {
  if (target.source && sources[target.source]) return sources[target.source];
  return sources[target.id];
}

export function screenBody(
  target: ResolvedTarget,
  brand: BrandConfig,
  sw: number,
  sh: number,
  family: string,
  presets: Record<string, HtmlPresetFn>,
  sources: SourceUrlMap,
  ui: HtmlUiKit,
): string {
  const fill = style({ position: 'absolute', inset: '0', width: px(sw), height: px(sh), overflow: 'hidden' });

  const preset = target.preset ? presets[target.preset] : undefined;
  if (preset) {
    const lw = logicalWidthFor(target);
    if (lw && sw > 0) {
      // Fixed-resolution author box + one uniform scale to fill the screen rect.
      const scale = Math.round((sw / lw) * 100000) / 100000;
      const lh = Math.round((sh / (sw / lw)) * 1000) / 1000; // logical height (px against DESIGN_WIDTH)
      const inner = preset({ w: lw, h: lh, brand, tokens: brand.colors, font: family, assets: sources, ui });
      const layer = div(
        style({
          position: 'absolute',
          left: '0',
          top: '0',
          width: px(lw),
          height: px(lh),
          transform: `scale(${scale})`,
          'transform-origin': 'top left',
        }),
        inner,
      );
      return div(fill, layer);
    }
    const inner = preset({ w: sw, h: sh, brand, tokens: brand.colors, font: family, assets: sources, ui });
    return div(fill, inner);
  }

  const url = resolveSourceUrl(target, sources);
  if (url) {
    return `<img src="${url}" style="${style({ position: 'absolute', inset: '0', width: px(sw), height: px(sh), 'object-fit': 'cover' })}" alt="" />`;
  }

  return div(style({ position: 'absolute', inset: '0', background: brand.colors.placeholder ?? brand.colors.bg }));
}
