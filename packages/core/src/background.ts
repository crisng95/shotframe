/**
 * Background compose. Generalizes the two source backgrounds:
 *   - mobile render() linear gradient + center-radial glow
 *   - ExtensionStudio bg() radial corner glow + vertical vignette
 * selected via `glowStyle`. All colors come from the BackgroundConfig.
 */
import type { Ctx, BackgroundConfig } from './types.js';
import { withAlpha } from './primitives.js';

export function drawBackground(ctx: Ctx, W: number, H: number, cfg: BackgroundConfig): void {
  if (cfg.type === 'solid') {
    ctx.fillStyle = cfg.color ?? cfg.stops?.[0] ?? 'black';
    ctx.fillRect(0, 0, W, H);
    return;
  }

  if (cfg.type === 'image') {
    // The image itself is drawn by the engine from sources; fill a base color
    // so any uncovered area is not transparent.
    ctx.fillStyle = cfg.color ?? cfg.stops?.[0] ?? 'black';
    ctx.fillRect(0, 0, W, H);
    return;
  }

  // gradient
  const stops = cfg.stops ?? [];
  const lg = ctx.createLinearGradient(0, 0, W, H);
  if (stops.length === 0) {
    lg.addColorStop(0, cfg.color ?? 'black');
    lg.addColorStop(1, cfg.color ?? 'black');
  } else if (stops.length === 1) {
    lg.addColorStop(0, stops[0]);
    lg.addColorStop(1, stops[0]);
  } else {
    stops.forEach((c, i) => lg.addColorStop(i / (stops.length - 1), c));
  }
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  if (!cfg.glow) return;

  if (cfg.glowStyle === 'corner-vignette') {
    const g = ctx.createRadialGradient(W * 0.32, H * -0.05, 0, W * 0.32, H * -0.05, H * 1.25);
    g.addColorStop(0, withAlpha(cfg.glow, 0.55));
    g.addColorStop(0.45, withAlpha(cfg.glow, 0.2));
    g.addColorStop(1, withAlpha(cfg.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const vCol = stops[stops.length - 1] ?? cfg.glow;
    const v = ctx.createLinearGradient(0, H * 0.5, 0, H);
    v.addColorStop(0, withAlpha(vCol, 0));
    v.addColorStop(1, withAlpha(vCol, 0.85));
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  } else {
    // center-radial (mobile): glow at 0.4 alpha (~the source's appended '66').
    const rad = ctx.createRadialGradient(W * 0.5, H * 0.16, 0, W * 0.5, H * 0.16, W * 0.9);
    rad.addColorStop(0, withAlpha(cfg.glow, 0.4));
    rad.addColorStop(1, 'transparent');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, W, H);
  }
}
