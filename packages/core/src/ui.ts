/**
 * Brand-free HTML component kit — returns HTML strings. A compact vocabulary a
 * preset author (or an AI agent) can use to build believable app screens without
 * hand-writing every div. Every color arrives via params (no brand literals).
 * Injected into the preset api as `ui`.
 */
import type { HtmlUiKit, IconName } from './types.js';
import { esc, withAlpha, style, px, div } from './css.js';

/** Minimal inline-SVG line icons (24×24 viewBox, currentColor stroke). */
const ICON_PATHS: Record<IconName, string> = {
  chevron: '<polyline points="9 6 15 12 9 18" />',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  check: '<polyline points="4 12 10 18 20 6" />',
  search: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
  heart: '<path d="M12 21C-4 10 5 2 12 8c7-6 16 2 0 13z"/>',
  star: '<polygon points="12 3 15 9 21.5 9.7 16.7 14.2 18 20.7 12 17.3 6 20.7 7.3 14.2 2.5 9.7 9 9"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M6 10v9h12v-9"/>',
};

function icon(name: IconName, size: number, color: string): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    (ICON_PATHS[name] ?? '') +
    `</svg>`
  );
}

function statusBar(s: { color: string; time?: string }): string {
  const bars = [4, 7, 10, 13]
    .map(
      (bh) =>
        `<span style="${style({ display: 'inline-block', width: '4px', height: px(bh), background: s.color, 'border-radius': '1px', 'vertical-align': 'bottom', 'margin-left': '2px' })}"></span>`,
    )
    .join('');
  return div(
    style({
      position: 'relative',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'space-between',
      padding: '14px 22px 0',
      color: s.color,
      'font-weight': '700',
      'font-size': '15px',
    }),
    `<span>${esc(s.time ?? '9:41')}</span><span style="display:inline-flex;align-items:flex-end;height:14px">${bars}</span>`,
  );
}

function card(
  inner: string,
  s: { fill: string; radius?: number; pad?: number; stroke?: string; shadow?: string },
): string {
  return div(
    style({
      background: s.fill,
      'border-radius': px(s.radius ?? 20),
      padding: px(s.pad ?? 16),
      border: s.stroke ? `1px solid ${s.stroke}` : undefined,
      'box-shadow': s.shadow ? `0 10px 30px ${s.shadow}` : undefined,
    }),
    inner,
  );
}

function button(
  label: string,
  s: { fill: string; color: string; radius?: number; pad?: string; fontPx?: number },
): string {
  return div(
    style({
      display: 'inline-block',
      background: s.fill,
      color: s.color,
      'border-radius': px(s.radius ?? 999),
      padding: s.pad ?? '12px 20px',
      'font-weight': '700',
      'font-size': px(s.fontPx ?? 15),
      'text-align': 'center',
    }),
    esc(label),
  );
}

function chip(
  label: string,
  s: { fill: string; color: string; fontPx?: number; padX?: number; h?: number },
): string {
  const h = s.h ?? 24;
  return div(
    style({
      display: 'inline-flex',
      'align-items': 'center',
      background: s.fill,
      color: s.color,
      height: px(h),
      'border-radius': px(h / 2),
      padding: `0 ${px(s.padX ?? 10)}`,
      'font-weight': '800',
      'font-size': px(s.fontPx ?? 12),
    }),
    esc(label),
  );
}

function tabBar(
  items: { label: string; icon?: IconName; active?: boolean }[],
  s: { color: string; activeColor: string; bg: string; h: number },
): string {
  const cells = items
    .map((it) => {
      const col = it.active ? s.activeColor : s.color;
      return div(
        style({
          flex: '1',
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
          gap: '3px',
          color: col,
          'font-size': '11px',
          'font-weight': it.active ? '700' : '500',
        }),
        (it.icon ? icon(it.icon, 22, col) : '') + `<span>${esc(it.label)}</span>`,
      );
    })
    .join('');
  return div(
    style({
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '100%',
      height: px(s.h),
      display: 'flex',
      background: s.bg,
    }),
    cells,
  );
}

export const ui: HtmlUiKit = {
  esc,
  withAlpha,
  statusBar,
  icon,
  card,
  button,
  chip,
  tabBar,
};
