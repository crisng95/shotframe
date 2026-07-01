# AGENTS.md — auto-generate store screenshots from a project

You are an AI coding agent operating **inside a user's project**. Your job: produce
store-ready screenshots for App Store / Google Play / Chrome Web Store **without asking
the user to take screenshots or hand-write config**. You read the project, understand
what the app is and how its screens look, **redraw the best screens** as shotframe
"presets", and render them.

This is the synthesize path: you don't run the app or capture real pixels — you
**reconstruct** each key screen with a compact UI vocabulary (`ui`) so it reads like
a real, polished screenshot. See [`examples/basic/presets/appdemo.ts`](./examples/basic/presets/appdemo.ts)
for a full worked example, and its output for the quality bar.

---

## The procedure

### 1. Understand the app
Read enough to answer: *what is this app, what's its single most compelling value, and
what are its key screens?*
- Identity/name: `package.json` `name`, `app.json`/`app.config.*` (Expo), `Info.plist`,
  `manifest.json` (extensions), README, landing copy.
- Screens: routes/pages (`app/`, `pages/`, `src/screens/`, React Router/Next/Expo Router),
  and the components they compose. Note each screen's layout (nav bar? list? cards? form?
  media? tabs?) and its real copy/labels.
- Pick the **3–6 screens that sell the app** — the hero feature, the "wow" moment, the
  core loop. Skip settings/legal/empty states. A store screen must show *value*, not chrome.

### 2. Extract the brand (map to `brand`)
Pull real colors so the redraw matches the app:
- Tailwind (`tailwind.config.*` theme.colors), CSS variables (`:root { --primary }`),
  design tokens, a theme/`colors.ts`, MUI/Chakra theme, `app.json` `primaryColor`, or the
  most prominent brand colors in the UI.
- Map to `brand.colors`: `primary` (main brand), `accent` (secondary/CTA), `bg` (screen
  background), `caption` (headline text over the store background), plus any extra tokens
  you'll use (`surface`/`placeholder`, `muted`, `bezel`). Pick a bundled `brand.font`
  (Inter, Montserrat, Poppins, 'Plus Jakarta Sans', 'DM Sans', 'Space Grotesk', Sora) that
  fits the brand's tone.

### 3. Redraw each screen as an HTML preset
For each chosen screen, write `presets/<screen>.ts` exporting an `HtmlPresetFn` that
returns the screen's **HTML string**. **Match the real screen**: same kind of nav bar, the
same list/cards/hero, real-ish labels drawn from the app's actual copy, brand colors. Aim
for "a designer's cleaned-up version of the real screen", not a generic mock.

Signature and rules:
```ts
import type { HtmlPresetFn } from '@shotframe/core';
const screen: HtmlPresetFn = ({ w, h, brand, tokens, font, assets, ui }) =>
  `<div style="position:absolute;inset:0;background:${tokens.bg}">…</div>`;
export default screen;
```
- **Self-contained — no imports, no closures, no module-scope variables.** The function
  body may be serialized (`.toString()`) and rebuilt in the studio realm. Everything you use
  must come from the single `api` argument. The `import type` line is erased at load — safe.
- **Colors from `tokens`/`brand.colors`**, never invented brand hexes (structural
  neutrals like `ui.withAlpha(ink, 0.08)` are fine).
- Layout with normal CSS (flexbox, `position:absolute`, `px` against `w`/`h`) filling the
  `w × h` screen. Prefer real `<img src="${assets.ref}">` photos + inline SVG icons +
  `box-shadow`/`backdrop-filter` for depth. Reuse the proportions from `appdemo.ts`.

### 4. Caption each screen
One short marketing headline per screen (the store caption, drawn ABOVE the device by
shotframe — not inside the screen). e.g. "Track every habit", "Chat with your docs".

### 5. Generate config + render
Write `shotframe.config.ts` (or `.json`): the `brand`, a `background` (gradient in brand
colors), `presets: [{ id, module }]`, and one `target` per screen per store you need
(App Store 1290×2796, Play 1080×1920, Chrome 1280×800 …). Targets use `preset: '<id>'`
(no `source`). Then:
```bash
shotframe            # render every target → ./store-assets/<store>/<id>.<ext>
```
Open the outputs, compare to the real screens, and iterate the presets until they look
right. Use `shotframe list` to see targets and `shotframe -t <id>` to re-render one.

---

## `api` reference (what a preset receives)

```
api = {
  w, h,          // screen size in px (fill this area with absolutely-positioned HTML)
  brand,         // the BrandConfig
  tokens,        // brand.colors by name (tokens.primary, tokens.accent, tokens.bg, …)
  font,          // resolved brand font family — set font-family:'${font}',sans-serif
  assets,        // { ref: url } for images you referenced (real photos, logo, icons)
  ui,            // HTML component kit (below) — each returns an HTML string
}
```
Wide targets (tablet/iPad): it is real HTML, so cap large type with `clamp()`/relative
sizing or branch on `w`/`h` so nothing balloons; containers stretch to fill naturally.

### `ui` components (each returns an HTML string; compose into your template)
```
ui.esc(s)                                          HTML-escape interpolated text
ui.withAlpha(hex, a)                               hex → rgba(...) at alpha a
ui.statusBar({color, time?})                       iOS time + signal row
ui.icon(name, size, color)                         inline SVG; name ∈ chevron|plus|check|
                                                     search|heart|star|bell|home
ui.card(innerHtml, {fill, radius?, pad?, stroke?, shadow?})
ui.button(label, {fill, color, radius?, pad?, fontPx?})
ui.chip(label, {fill, color, fontPx?, padX?, h?})
ui.tabBar([{label, icon?, active?}], {color, activeColor, bg, h})   absolute bottom bar
```
Exact field types live in `@shotframe/core` `types.ts` (`HtmlUiKit`), but the signatures
above + `appdemo.ts` are enough. For anything the kit doesn't cover, just write plain HTML/CSS.

---

## Good store screens (principles)
- **Show the payoff**, not navigation. Lead with the screen a user would screenshot to
  show a friend.
- **One idea per screen**, echoed by the caption. Don't cram.
- **Real content**, not lorem: use the app's actual entity names, labels, and numbers so
  it reads true.
- **Order to tell a story** across the screenshots (hook → core value → proof → CTA).
- Match the app's real look (dark vs light, rounded vs sharp, its accent color).

## Checklist
- [ ] Identified the app + its 3–6 selling screens (not settings/empty states)
- [ ] Brand colors + font pulled from the real theme → `brand`
- [ ] One self-contained preset per screen using `ui`, colors from `tokens`
- [ ] A marketing caption per screen
- [ ] `shotframe.config.ts` with a target per screen/store; `shotframe` renders clean
- [ ] Opened the outputs and iterated until each reads like the real, polished screen
