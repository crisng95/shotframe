import type { PresetDrawFn } from '@shotframe/core';

/**
 * A believable mobile app HOME screen, redrawn ENTIRELY with the injected
 * high-level UI kit (`api.ui`) — no raw canvas calls. This is the demonstration
 * that an AI agent can reconstruct an app screen from a compact vocabulary:
 * status bar, nav bar, a hero media card, a feed of list rows with avatars, a
 * primary button and a bottom tab bar.
 *
 * SELF-CONTAINED: like every preset, it references ONLY its `(ctx, api)` args —
 * the body is serialized and rebuilt in the browser realm, so no imports/closures.
 * Colors come exclusively from the brand `tokens` (with literal fallbacks that are
 * fine HERE — the brand-free rule only binds `@shotframe/core`, not example presets).
 */
const appdemo: PresetDrawFn = (ctx, { w, h, brand, tokens, prim, font, ui }) => {
  const primary = tokens.primary ?? brand.colors.primary;
  const accent = tokens.accent ?? brand.colors.accent;
  const bg = tokens.bg ?? brand.colors.bg;
  const ink = tokens.caption ?? '#ffffff';
  const surface = tokens.placeholder ?? '#111a2c';
  const muted = prim.withAlpha(ink, 0.6);
  const pad = w * 0.06;

  // 0) screen background
  prim.scrBg(ctx, 0, 0, w, h, { bg: [bg, '#070b16'], glow: accent, radial: true });

  // 1) iOS status bar
  ui.statusBar(ctx, 0, 0, w, { color: ink, time: '9:41', family: font });

  // 2) large-title nav bar
  ui.navBar(ctx, 0, h * 0.04, w, {
    title: 'Discover',
    color: ink,
    align: 'left',
    trailing: 'search',
    family: font,
  });

  // 3) hero media card — image box + overlay heading + a category chip + progress
  const heroY = h * 0.135;
  const heroH = h * 0.2;
  ui.card(ctx, pad, heroY, w - pad * 2, heroH, {
    fill: surface,
    radius: w * 0.05,
    stroke: prim.withAlpha(ink, 0.08),
    shadow: prim.withAlpha(primary, 0.4),
  });
  ui.imageBox(ctx, pad, heroY, w - pad * 2, heroH * 0.62, {
    fill: primary,
    radius: w * 0.05,
    icon: 'star',
    iconColor: prim.withAlpha(ink, 0.9),
  });
  ui.chip(ctx, pad + w * 0.04, heroY + heroH * 0.06, {
    label: 'Featured',
    fill: prim.withAlpha(accent, 0.95),
    color: ink,
    h: h * 0.03,
    family: font,
  });
  ui.heading(ctx, pad + w * 0.05, heroY + heroH * 0.66, {
    text: 'Weekly picks for you',
    size: w * 0.05,
    color: ink,
    family: font,
  });
  ui.progressBar(ctx, pad + w * 0.05, heroY + heroH * 0.88, w - pad * 2 - w * 0.1, {
    value: 0.68,
    track: prim.withAlpha(ink, 0.14),
    fill: accent,
    h: h * 0.006,
  });

  // 4) section heading
  ui.heading(ctx, pad, h * 0.365, {
    text: 'Your feed',
    size: w * 0.048,
    color: ink,
    family: font,
  });

  // 5) a feed of list rows with avatars, titles/subtitles and a trailing chevron
  const rows = [
    { name: 'Ava Mitchell', note: 'Shared a new collection', initials: 'AM', tint: primary },
    { name: 'Liam Carter', note: 'Started following you', initials: 'LC', tint: accent },
    { name: 'Noah Bennett', note: 'Liked your latest post', initials: 'NB', tint: primary },
    { name: 'Mia Foster', note: 'Commented: looks great!', initials: 'MF', tint: accent },
  ];
  const rowH = h * 0.075;
  let ry = h * 0.4;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    ui.listRow(ctx, pad, ry, w - pad * 2, rowH, {
      title: r.name,
      subtitle: r.note,
      leading: { fill: prim.withAlpha(r.tint, 0.9), initials: r.initials, color: ink },
      trailing: 'chevron',
      colors: { title: ink, subtitle: muted, trailing: muted },
      divider: i < rows.length - 1 ? prim.withAlpha(ink, 0.08) : undefined,
      family: font,
    });
    ry += rowH;
  }

  // 6) primary call-to-action button
  ui.button(ctx, pad, h * 0.72, w - pad * 2, h * 0.062, {
    label: 'Explore more',
    fill: primary,
    color: ink,
    radius: w * 0.04,
    family: font,
  });

  // 7) bottom tab bar
  const tabH = h * 0.085;
  ui.tabBar(ctx, 0, h - tabH, w, tabH, {
    items: [
      { label: 'Home', icon: 'home', active: true },
      { label: 'Search', icon: 'search' },
      { label: 'Saved', icon: 'heart' },
      { label: 'Alerts', icon: 'bell' },
    ],
    color: ink,
    activeColor: primary,
    bg: prim.withAlpha(surface, 0.96),
    family: font,
  });
};

export default appdemo;
