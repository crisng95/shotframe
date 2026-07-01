import type { PresetDrawFn } from '@shotframe/core';

/**
 * Example Path B preset — a fully SYNTHETIC "hero" screen.
 *
 * It needs no real screenshot: it draws everything with ONLY the injected core
 * toolkit (`prim`) plus brand colors/tokens. This is the generic demonstration
 * of the preset mechanism — `shotframe render`/`studio` resolve this module to
 * its default export and inject it as `presets['hero']`, then `renderTarget`
 * clips + translates to the screen rect and calls it with `{ w, h, brand, tokens, prim, font }`.
 * `font` is the resolved brand font family — pass it to every `prim.tx`/`prim.F`/
 * `pill({ family })` so the synthetic screen honors the chosen bundled font too.
 *
 * IMPORTANT (self-contained rule): a preset may reference ONLY its `(ctx, api)`
 * arguments — no module-scope variables/imports — because only the function body
 * survives serialization into the browser render realm. Type-only imports (like
 * the one above) are erased at load time and are fine.
 *
 * NOTE: a real project (e.g. AI Solve Quiz) would ship its own `S_*` mock screens
 * as a preset module exactly like this, in its OWN repo. Those brand-specific
 * screens are intentionally NOT ported here — this stays generic.
 */
const hero: PresetDrawFn = (ctx, { w, h, brand, tokens, prim, font, ui }) => {
  const primary = tokens.primary ?? brand.colors.primary;
  const accent = tokens.accent ?? brand.colors.accent;
  const bg = tokens.bg ?? brand.colors.bg;
  const ink = tokens.caption ?? '#ffffff';
  const card = tokens.placeholder ?? '#0d1422';

  // 1) screen background: vertical gradient + soft top glow
  prim.scrBg(ctx, 0, 0, w, h, { bg: [bg, '#070b16'], glow: accent, radial: true });

  // 2) injected UI kit: a top nav bar proves the `ui` object is passed in end to end.
  ui.navBar(ctx, 0, h * 0.03, w, {
    title: brand.name,
    color: ink,
    leading: 'chevron',
    trailing: 'bell',
    family: font,
  });

  const pad = w * 0.09;

  // 3) headline
  prim.tx(ctx, 'Build once.', pad, h * 0.18, w * 0.085, 800, ink, 'left', font);
  prim.tx(ctx, 'Ship everywhere.', pad, h * 0.18 + w * 0.1, w * 0.085, 800, primary, 'left', font);

  // 4) two feature pills
  const py = h * 0.33;
  prim.pill(ctx, pad, py, null, w * 0.062, {
    fill: prim.withAlpha(primary, 0.16),
    text: 'App Store',
    color: ink,
    fontPx: w * 0.032,
    fontWt: 600,
    padX: w * 0.04,
    align: 'left',
    family: font,
  });
  prim.pill(ctx, pad, py + w * 0.09, null, w * 0.062, {
    fill: prim.withAlpha(accent, 0.16),
    text: 'Google Play',
    color: ink,
    fontPx: w * 0.032,
    fontWt: 600,
    padX: w * 0.04,
    align: 'left',
    family: font,
  });

  // 5) a card with an icon, title and wrapped body text — drawn via the injected UI kit
  const cx = pad;
  const cy = h * 0.52;
  const cw = w - pad * 2;
  const chh = h * 0.34;
  ui.card(ctx, cx, cy, cw, chh, {
    fill: card,
    radius: 24,
    stroke: prim.withAlpha(ink, 0.1),
    shadow: prim.withAlpha(primary, 0.35),
  });
  prim.fig(ctx, cx + cw * 0.08, cy + chh * 0.13, w * 0.08, 'square', accent);
  ui.heading(ctx, cx + cw * 0.08, cy + chh * 0.34, {
    text: 'One config',
    size: w * 0.05,
    weight: 700,
    color: ink,
    family: font,
  });
  ui.paragraph(ctx, cx + cw * 0.08, cy + chh * 0.5, {
    text: 'Frame real screenshots into pixel-exact store assets from one shared config.',
    size: w * 0.033,
    color: prim.withAlpha(ink, 0.72),
    maxW: cw * 0.84,
    lineH: w * 0.05,
    family: font,
  });

  // 6) a primary call-to-action button (injected UI kit)
  ui.button(ctx, cx + cw * 0.08, cy + chh * 0.78, cw * 0.5, w * 0.11, {
    label: 'Get started',
    fill: primary,
    color: ink,
    family: font,
  });
};

export default hero;
