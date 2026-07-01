/**
 * Background compose → CSS. Faithful port of the old canvas `drawBackground`:
 *   - solid                       → flat fill
 *   - gradient + center-radial    → mobile: linear corner gradient + top glow
 *   - gradient + corner-vignette  → CWS: radial corner glow + bottom vignette
 *   - image                       → cover image over a base color
 * All colors arrive via BackgroundConfig; no brand literals here.
 */
import type { BackgroundConfig, SourceUrlMap } from './types.js';
import { withAlpha, style, div } from './css.js';

/** CSS angle (deg) matching a canvas `createLinearGradient(0,0,W,H)` direction. */
function cornerAngle(w: number, h: number): number {
  const deg = (Math.atan2(w, -h) * 180) / Math.PI;
  return Math.round(((deg % 360) + 360) % 360);
}

function linearStops(stops: string[], color?: string): string {
  if (stops.length === 0) {
    const c = color ?? 'black';
    return `${c},${c}`;
  }
  if (stops.length === 1) return `${stops[0]},${stops[0]}`;
  return stops
    .map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 10000) / 100}%`)
    .join(',');
}

/**
 * Absolutely-positioned background layer filling the whole asset (W×H).
 * `sources` supplies the URL for an image background.
 */
export function backgroundLayer(
  cfg: BackgroundConfig,
  w: number,
  h: number,
  sources: SourceUrlMap = {},
): string {
  const base: Record<string, string | number> = {
    position: 'absolute',
    inset: '0',
  };

  if (cfg.type === 'solid') {
    base['background'] = cfg.color ?? cfg.stops?.[0] ?? 'black';
    return div(style(base));
  }

  if (cfg.type === 'image') {
    const url = cfg.image ? sources[cfg.image] : undefined;
    const baseColor = cfg.color ?? cfg.stops?.[0] ?? 'black';
    base['background'] = url ? `url('${url}') center/cover no-repeat, ${baseColor}` : baseColor;
    return div(style(base));
  }

  // gradient
  const stops = cfg.stops ?? [];
  const angle = cornerAngle(w, h);
  const linear = `linear-gradient(${angle}deg, ${linearStops(stops, cfg.color)})`;

  const layers: string[] = [];
  if (cfg.glow) {
    if (cfg.glowStyle === 'corner-vignette') {
      // radial corner glow at (32%, -5%), radius ~1.25H
      layers.push(
        `radial-gradient(${Math.round(h * 1.25)}px at 32% -5%, ` +
          `${withAlpha(cfg.glow, 0.55)} 0%, ${withAlpha(cfg.glow, 0.2)} 45%, ${withAlpha(cfg.glow, 0)} 100%)`,
      );
      // vertical vignette bottom half, from the last stop color
      const vCol = stops[stops.length - 1] ?? cfg.glow;
      layers.push(
        `linear-gradient(to bottom, ${withAlpha(vCol, 0)} 50%, ${withAlpha(vCol, 0.85)} 100%)`,
      );
    } else {
      // center-radial (mobile): glow at (50%,16%), radius ~0.9W, alpha 0.4
      layers.push(
        `radial-gradient(${Math.round(w * 0.9)}px at 50% 16%, ` +
          `${withAlpha(cfg.glow, 0.4)} 0%, ${withAlpha(cfg.glow, 0)} 100%)`,
      );
    }
  }
  layers.push(linear);

  base['background'] = layers.join(',');
  return div(style(base));
}
