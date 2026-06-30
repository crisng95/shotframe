/**
 * Caption layout + draw. Ported from the source `wrapCap` (444) and the caption
 * pieces of render() (450-454, 463). Caption color is supplied by the caller.
 */
import type { Ctx } from './types.js';
import { F } from './primitives.js';

/** Wrap a (possibly multi-line) caption to `maxW`, honoring explicit newlines. */
export function wrapCap(g: Ctx, t: string, maxW: number): string[] {
  const out: string[] = [];
  t.split('\n').forEach((par) => {
    const ws = par.split(' ');
    let l = '';
    for (const w of ws) {
      const tt = l ? l + ' ' + w : w;
      if (g.measureText(tt).width > maxW && l) {
        out.push(l);
        l = w;
      } else {
        l = tt;
      }
    }
    out.push(l);
  });
  return out;
}

/** Draw caption lines centered horizontally with a soft shadow. */
export function drawCaption(
  g: Ctx,
  lines: string[],
  W: number,
  capY: number,
  headPx: number,
  lineH: number,
  color: string,
  family?: string,
): void {
  F(g, headPx, 800, family);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.shadowColor = 'rgba(0,0,0,.35)';
  g.shadowBlur = W * 0.01;
  lines.forEach((l, i) => g.fillText(l, W / 2, capY + i * lineH));
  g.shadowBlur = 0;
}
