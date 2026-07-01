import type { HtmlPresetFn } from '@shotframe/core';

/**
 * Example Path B preset — a believable app HOME screen, redrawn ENTIRELY in HTML
 * with the injected `ui` component kit (statusBar / card / chip / tabBar) + brand
 * tokens. No real screenshot. Self-contained: only the `api` argument is used.
 */
const appdemo: HtmlPresetFn = ({ w, h, brand, tokens, font, ui }) => {
  const primary = tokens.primary ?? brand.colors.primary;
  const accent = tokens.accent ?? brand.colors.accent;
  const bg = tokens.bg ?? brand.colors.bg;
  const ink = tokens.caption ?? '#ffffff';
  const surface = tokens.placeholder ?? '#0d1422';
  const muted = ui.withAlpha(ink, 0.6);
  const pad = Math.round(w * 0.06);
  const tabH = Math.round(h * 0.09);

  const row = (title: string, sub: string, val: string) =>
    ui.card(
      `<div style="display:flex;align-items:center;gap:${Math.round(w * 0.04)}px">
        <div style="width:${Math.round(w * 0.12)}px;height:${Math.round(w * 0.12)}px;border-radius:${Math.round(w * 0.04)}px;background:linear-gradient(135deg,${primary},${accent})"></div>
        <div style="flex:1">
          <div style="font-size:${Math.round(w * 0.042)}px;font-weight:700">${ui.esc(title)}</div>
          <div style="font-size:${Math.round(w * 0.033)}px;color:${muted}">${ui.esc(sub)}</div>
        </div>
        <div style="font-size:${Math.round(w * 0.045)}px;font-weight:800;color:${accent}">${ui.esc(val)}</div>
      </div>`,
      { fill: surface, radius: Math.round(w * 0.05), pad: Math.round(w * 0.045) },
    );

  return `<div style="position:absolute;inset:0;background:${bg};color:${ink};font-family:'${font}',sans-serif;overflow:hidden">
  ${ui.statusBar({ color: ink })}
  <div style="position:absolute;left:${pad}px;right:${pad}px;top:${Math.round(h * 0.09)}px">
    <div style="font-size:${Math.round(w * 0.033)}px;color:${muted};font-weight:600">Good evening</div>
    <div style="font-size:${Math.round(w * 0.085)}px;font-weight:800;margin-top:${Math.round(w * 0.01)}px">${ui.esc(brand.name)}</div>
    <div style="display:flex;gap:${Math.round(w * 0.025)}px;margin-top:${Math.round(w * 0.04)}px">
      ${ui.chip('Today', { fill: primary, color: '#fff', fontPx: Math.round(w * 0.033), padX: Math.round(w * 0.04), h: Math.round(w * 0.09) })}
      ${ui.chip('Week', { fill: surface, color: muted, fontPx: Math.round(w * 0.033), padX: Math.round(w * 0.04), h: Math.round(w * 0.09) })}
      ${ui.chip('Month', { fill: surface, color: muted, fontPx: Math.round(w * 0.033), padX: Math.round(w * 0.04), h: Math.round(w * 0.09) })}
    </div>
    <div style="display:flex;flex-direction:column;gap:${Math.round(w * 0.035)}px;margin-top:${Math.round(w * 0.05)}px">
      ${row('Morning run', '5.2 km · 28 min', '+120')}
      ${row('Focus session', 'Deep work · 50 min', '+80')}
      ${row('Reading', 'Design systems · 20 min', '+40')}
    </div>
  </div>
  ${ui.tabBar(
    [
      { label: 'Home', icon: 'home', active: true },
      { label: 'Search', icon: 'search' },
      { label: 'Saved', icon: 'heart' },
      { label: 'Alerts', icon: 'bell' },
    ],
    { color: muted, activeColor: primary, bg: surface, h: tabH },
  )}
</div>`;
};

export default appdemo;
