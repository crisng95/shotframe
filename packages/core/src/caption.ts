/**
 * Caption layout + HTML. Faithful port of the old canvas caption:
 *   pad = W*0.075, headPx = round(W*0.06*sizeMul), lineH = headPx*1.16,
 *   weight 800, centered, soft text-shadow. Top: y = H*0.075.
 *   Bottom: y = H - capH - H*0.055. Explicit `\n` splits lines; CSS wraps within.
 */
import type { CaptionConfig } from './types.js';
import { esc, style, px, div } from './css.js';

export interface CaptionMetrics {
  lines: string[];
  headPx: number;
  lineH: number;
  capH: number;
  capBottom: boolean;
  capY: number;
  /** Screen usable band top/bottom once the caption is placed. */
  areaTop: number;
  areaBot: number;
}

/** Compute caption + screen-area geometry (matches old renderTarget math). */
export function captionMetrics(cap: CaptionConfig | undefined, w: number, h: number): CaptionMetrics {
  const headMul = cap?.sizeMul ?? 1;
  const headPx = Math.round(w * 0.06 * headMul);
  const lineH = headPx * 1.16;
  const lines = cap?.text ? cap.text.split('\n') : [];
  const hasCap = lines.length > 0 && lines.some((l) => l.trim());
  const capH = hasCap ? lines.length * lineH : 0;
  const capBottom = cap?.position === 'bottom';
  const capY = capBottom ? h - capH - h * 0.055 : h * 0.075;

  const areaTop = hasCap ? (capBottom ? h * 0.06 : capY + capH + h * 0.045) : h * 0.03;
  const areaBot = hasCap ? (capBottom ? capY - h * 0.04 : h * 0.965) : h * 0.97;

  return { lines: hasCap ? lines : [], headPx, lineH, capH, capBottom, capY, areaTop, areaBot };
}

/** Absolutely-positioned caption block. Empty string when there is no caption. */
export function captionLayer(
  m: CaptionMetrics,
  w: number,
  color: string,
  family: string,
): string {
  if (m.lines.length === 0) return '';
  const pad = w * 0.075;
  const inner = m.lines
    .map(
      (l) =>
        `<div style="${style({ height: px(m.lineH), 'line-height': px(m.lineH) })}">${esc(l)}</div>`,
    )
    .join('');
  return div(
    style({
      position: 'absolute',
      top: px(m.capY),
      left: px(pad),
      width: px(w - 2 * pad),
      'text-align': 'center',
      'font-family': `'${family}',sans-serif`,
      'font-weight': '800',
      'font-size': px(m.headPx),
      color,
      'text-shadow': `0 0 ${px(w * 0.01)} rgba(0,0,0,.35)`,
      'white-space': 'pre-wrap',
    }),
    inner,
  );
}
