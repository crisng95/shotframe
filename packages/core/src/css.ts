/**
 * Tiny, dependency-free HTML/CSS string helpers.
 *
 * The Full-DOM engine builds an asset as an HTML string (isomorphic: same code
 * runs in Node for the CLI and in the browser for the studio). No `document`,
 * no canvas. These helpers keep that string-building safe and terse.
 */

/** HTML-escape text destined for element content or a double-quoted attribute. */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Serialize a style object to an inline `style="..."` value. `null`/`undefined`
 * entries are dropped; numbers pass through (callers append units themselves).
 */
export function style(decls: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(decls)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${k}:${v}`);
  }
  return parts.join(';');
}

/** px helper — rounds to 3 decimals so serialized output stays deterministic. */
export function px(n: number): string {
  return `${Math.round(n * 1000) / 1000}px`;
}

/**
 * Apply an alpha to a color. `#rgb` / `#rrggbb` -> `rgba(...)`. Non-hex inputs
 * (named colors, existing rgba, `transparent`) pass through unchanged. Ported
 * verbatim from the old canvas `primitives.withAlpha` so gradient/glow math is
 * pixel-faithful to the previous engine.
 */
export function withAlpha(color: string, a: number): string {
  if (color[0] !== '#') return color;
  const hexBody = color.slice(1);
  let r: number;
  let g: number;
  let b: number;
  if (hexBody.length === 3) {
    r = parseInt(hexBody[0] + hexBody[0], 16);
    g = parseInt(hexBody[1] + hexBody[1], 16);
    b = parseInt(hexBody[2] + hexBody[2], 16);
  } else {
    r = parseInt(hexBody.slice(0, 2), 16);
    g = parseInt(hexBody.slice(2, 4), 16);
    b = parseInt(hexBody.slice(4, 6), 16);
  }
  return `rgba(${r},${g},${b},${a})`;
}

/** A `<div>` with an inline style string and optional inner HTML. */
export function div(styleStr: string, inner = '', attrs = ''): string {
  return `<div style="${styleStr}"${attrs ? ' ' + attrs : ''}>${inner}</div>`;
}
