import type { HtmlPresetFn } from '@shotframe/core';

/**
 * Example Path B preset — a fully SYNTHETIC "hero" screen, as an HTML string.
 *
 * It needs no real screenshot: it returns the screen's HTML, built with plain
 * CSS + the injected `ui` helpers and brand `tokens`. `shotframe render`/`studio`
 * resolve this module to its default export, inject it as `presets['hero']`, and
 * `renderAsset` places the returned HTML inside the device screen rect (w × h px).
 *
 * IMPORTANT (self-contained rule): a preset may reference ONLY its single `api`
 * argument — no module-scope variables/imports — because the function body may be
 * serialized into the studio's browser realm. Type-only imports are erased.
 */
const hero: HtmlPresetFn = ({ w, h, brand, tokens, font, ui }) => {
  const primary = tokens.primary ?? brand.colors.primary;
  const accent = tokens.accent ?? brand.colors.accent;
  const bg = tokens.bg ?? brand.colors.bg;
  const ink = tokens.caption ?? '#ffffff';
  const card = tokens.placeholder ?? '#0d1422';
  const pad = Math.round(w * 0.08);
  const bars = [0.4, 0.7, 0.55, 0.9, 0.65]
    .map(
      (v) =>
        `<div style="flex:1;height:${Math.round(v * w * 0.28)}px;border-radius:${Math.round(w * 0.02)}px;background:linear-gradient(180deg,${accent},${primary})"></div>`,
    )
    .join('');

  return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,${bg},#070b16);color:${ink};font-family:'${font}',sans-serif;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(${Math.round(w * 0.9)}px at 50% 8%, ${ui.withAlpha(accent, 0.35)} 0%, transparent 70%)"></div>
  ${ui.statusBar({ color: ink })}
  <div style="position:absolute;left:${pad}px;right:${pad}px;top:${Math.round(h * 0.13)}px">
    <div style="font-size:${Math.round(w * 0.115)}px;font-weight:800;line-height:1.05">${ui.esc(brand.name)}</div>
    <div style="margin-top:${Math.round(w * 0.03)}px;font-size:${Math.round(w * 0.05)}px;font-weight:500;color:${ui.withAlpha(ink, 0.7)}">No screenshot needed — a synthetic hero, all HTML.</div>
  </div>
  <div style="position:absolute;left:${pad}px;right:${pad}px;top:${Math.round(h * 0.32)}px;padding:${Math.round(w * 0.06)}px;border-radius:${Math.round(w * 0.06)}px;background:${card};box-shadow:0 ${Math.round(w * 0.03)}px ${Math.round(w * 0.08)}px rgba(0,0,0,.45)">
    <div style="font-size:${Math.round(w * 0.045)}px;font-weight:700">This week</div>
    <div style="display:flex;gap:${Math.round(w * 0.03)}px;align-items:flex-end;height:${Math.round(w * 0.3)}px;margin-top:${Math.round(w * 0.05)}px">${bars}</div>
  </div>
  <div style="position:absolute;left:${pad}px;right:${pad}px;bottom:${Math.round(h * 0.09)}px;text-align:center">
    ${ui.button('Get started', { fill: primary, color: '#fff', pad: `${Math.round(w * 0.05)}px ${Math.round(w * 0.1)}px`, fontPx: Math.round(w * 0.05) })}
  </div>
</div>`;
};

export default hero;
