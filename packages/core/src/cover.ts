/**
 * Path A core: clip an already-decoded image (cover-fit) into a rounded frame.
 * Ported from the source `drawCover` (607-613), generalized to the union radius.
 */
import type { Ctx, Radius, SourceImage } from './types.js';
import { rr } from './primitives.js';

export function drawCover(
  ctx: Ctx,
  img: SourceImage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: Radius,
): void {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  const ir = img.width / img.height;
  const fr = w / h;
  let dw: number;
  let dh: number;
  if (ir > fr) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}
