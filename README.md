# shotframe

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Frame real screenshots into store-ready assets — App Store, Google Play and
Chrome Web Store — at the exact pixel sizes each store demands, all from one
shared config.**

You point shotframe at your real screenshots (or a synthetic preset), it wraps
each one in a device bezel / browser chrome + a gradient background + a caption,
and exports dimension-exact PNG/JPEG for every target. One config drives both a
headless batch renderer (`shotframe render`) and a live browser editor
(`shotframe studio`) — the **same** canvas engine renders both, so there is zero
drift between preview and output.

---

## Install

```bash
npm i -D @shotframe/cli
# or: pnpm add -D @shotframe/cli   ·   yarn add -D @shotframe/cli
```

`render` drives a real Chromium via Playwright, so install the browser once:

```bash
npx playwright install chromium
```

## Quickstart

Create `shotframe.config.ts`:

```ts
import { defineConfig } from '@shotframe/config';

export default defineConfig({
  brand: {
    name: 'My App',
    colors: {
      primary: '#2563eb',
      accent: '#7c5cff',
      bg: '#0a1124',
      bezel: '#05070d',
      caption: '#ffffff',
    },
  },
  background: {
    type: 'gradient',
    glowStyle: 'center-radial',
    stops: ['#0a1124', '#0a0f1c'],
    glow: '#5b3df0',
  },
  output: { dir: './store-assets' },
  targets: [
    {
      store: 'appstore',
      id: 'iphone69-1',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Frame your shots\nfor every store', position: 'top' },
      source: './shots/home.png', // your real screenshot
    },
    {
      store: 'chrome',
      id: 'screenshot-1',
      size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'myapp.example.com' },
      output: { format: 'png' },
      source: './shots/web.png',
    },
  ],
});
```

Then:

```bash
npx shotframe render            # headless batch → ./store-assets/<store>/<id>.<ext>
npx shotframe studio           # live browser editor on http://127.0.0.1:5179
```

`render` flags: `--config <path>`, `--out <dir>` (overrides `output.dir`),
`--store <appstore|play|chrome>` (render one store only).

## Store target matrix (exact sizes)

These exact pixel sizes ship as built-in **store packs** (`@shotframe/config`),
so you can spread a pack and only override what you need. Sizes are guaranteed
exactly — shotframe reads the canvas buffer rather than screenshotting a viewport.

| Store | Target id | Size (px) | Default frame | Default output |
| --- | --- | --- | --- | --- |
| App Store | `iphone69` | 1290 × 2796 | canvas bezel (island) | JPEG q0.94 |
| App Store | `ipad13` | 2064 × 2752 | canvas bezel | JPEG q0.94 |
| Google Play | `phone` | 1080 × 1920 | canvas bezel (hole) | JPEG q0.94 |
| Google Play | `tablet` | 1600 × 2560 | canvas bezel (hole) | JPEG q0.94 |
| Google Play | `feature-graphic` | 1024 × 500 | none | JPEG q0.94 |
| Chrome Web Store | `screenshot-1…5` | 1280 × 800 | browser chrome | PNG |
| Chrome Web Store | `small-promo` | 440 × 280 | none | PNG |
| Chrome Web Store | `marquee` | 1400 × 560 | none | PNG |

## Path A vs Path B

**Path A — frame a real screenshot (the core use case).** Give a target a
`source:` pointing at a real image; shotframe cover-fits it into the chosen
frame:

- `frame.type: 'canvas'` — a parametric, drawn device bezel (no trademarked PNGs;
  MIT-safe). `radius` is a fraction of frame width; `island: 'island' | 'hole' | 'none'`.
- `frame.type: 'browser'` — browser chrome (traffic lights + URL bar) for Chrome
  Web Store screenshots; set `url`.
- `frame.type: 'image'` — supply your own licensed device-frame PNG via `src`.
- `frame.type: 'none'` — bare image (e.g. a feature graphic).

**Path B — synthetic preset (no screenshot needed).** Register a preset and a
target draws a fully synthetic screen instead of a real image:

```ts
export default defineConfig({
  // ...
  presets: [{ id: 'hero', module: './presets/hero.ts' }],
  targets: [
    {
      store: 'appstore',
      id: 'iphone69-hero',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      preset: 'hero', // ← draws via the preset, no `source`
    },
  ],
});
```

A preset module default-exports a `PresetDrawFn` that draws using **only** the
injected toolkit — see [`examples/basic/presets/hero.ts`](./examples/basic/presets/hero.ts):

```ts
import type { PresetDrawFn } from '@shotframe/core';

const hero: PresetDrawFn = (ctx, { w, h, brand, tokens, prim, font }) => {
  prim.scrBg(ctx, 0, 0, w, h, { bg: [tokens.bg, '#070b16'], glow: tokens.accent, radial: true });
  prim.tx(ctx, 'Build once.', w * 0.09, h * 0.18, w * 0.085, 800, tokens.caption, 'left', font);
  // pass `font` (the resolved brand family) to prim.tx/F/pill so synthetic text matches.
  // ...only `prim`, `brand`, `tokens`, `font` — no module-scope state (it's serialized to the render realm).
};
export default hero;
```

> A real project (e.g. AI Solve Quiz) ships its own brand-specific `S_*` screens
> as a preset module exactly like this, in its **own** repo — those are the
> canonical Path B example and are intentionally not bundled into shotframe.

## Fonts

shotframe **bundles** its webfonts (as Latin-subset `woff2` in
[`@shotframe/fonts`](./packages/fonts)) and **loads them before rendering**, so
text measures and wraps identically on macOS, Linux and CI — the output is
deterministic across OS rather than depending on whatever fonts the host happens
to have installed.

Pick a bundled family by name via `brand.font`:

```ts
brand: {
  name: 'My App',
  font: 'Plus Jakarta Sans', // a bundled family name (default: Inter)
  colors: { /* ... */ },
}
```

Bundled families (all [OFL-1.1](./packages/fonts/LICENSES)):

| Family | `brand.font` value |
| --- | --- |
| Inter (default) | `'Inter'` |
| Roboto | `'Roboto'` |
| Montserrat | `'Montserrat'` |
| Poppins | `'Poppins'` |
| Plus Jakarta Sans | `'Plus Jakarta Sans'` |
| DM Sans | `'DM Sans'` |
| Space Grotesk | `'Space Grotesk'` |
| Sora | `'Sora'` |

Leaving `brand.font` unset falls back to the bundled **Inter** — never silently
to a system font, so determinism holds by default.

**Custom font** — to use a family that isn't bundled, point `brand.fontFace` at
your own `woff2` (a local path, served like a source image, or a URL). It is
loaded before render the same way:

```ts
brand: {
  font: 'My Brand Sans',
  fontFace: {
    family: 'My Brand Sans',
    src: './fonts/my-brand-sans.woff2',
    weights: ['400', '700'], // optional; defaults to one variable face
  },
  colors: { /* ... */ },
}
```

> Bundled fonts keep their upstream **OFL-1.1** license — see
> [`@shotframe/fonts/LICENSES`](./packages/fonts/LICENSES). The package code
> itself is MIT.

## How it works

`@shotframe/core` exposes one sync, pure function
`renderTarget(ctx, config, target, sources, presets)` that composes
**background → frame → cover(source) | preset → caption** onto a 2D context.
Both the studio (a real `<canvas>`) and `render` (a Playwright-driven offscreen
`<canvas>`) call the **same** engine and read the canvas buffer
(`canvas.toDataURL` / `toBlob`) — so output is **dimension-exact** and the
studio preview matches the rendered file byte-for-byte on the same platform.
Before the first `renderTarget` call the shell **loads the bundled webfont** for
`brand.font` (see [Fonts](#fonts)), so text metrics — and therefore the bytes —
are the **same on every OS**, not dependent on the host's installed fonts.

## Packages

| Package | What it is | Published |
| --- | --- | --- |
| [`@shotframe/core`](./packages/core) | Brand-free canvas engine + stable primitive toolkit. Zero runtime deps, browser-target. | ✅ |
| [`@shotframe/config`](./packages/config) | Zod schema, `defineConfig`, jiti config loader, built-in store packs. | ✅ |
| [`@shotframe/cli`](./packages/cli) | `shotframe render` / `shotframe studio`. Bundles the studio UI. | ✅ |
| `@shotframe/studio` | Vite browser editor (bundled inside the CLI). | ➖ private |

See [`docs/config-schema.md`](./docs/config-schema.md) for every config field and
[`examples/basic`](./examples/basic) for a runnable example.

## Requirements

- Node 20.6+ (the CLI relies on stable `import.meta.resolve`)
- `npx playwright install chromium` (only for `render`; `core`/`config` are browser-only and need no browser to import)

## Contributing & publishing

This is a pnpm workspace.

```bash
pnpm install
pnpm -r build && pnpm -r typecheck && pnpm -r test
```

Releases use [changesets](https://github.com/changesets/changesets): run
`pnpm changeset` to record a bump, merge to `main`, and the release workflow runs
`changeset version` + `changeset publish`.

**Publish order** (dependency order): `@shotframe/core` → `@shotframe/config` →
`@shotframe/studio` (built, then bundled into the CLI) → `@shotframe/cli`.
`changeset publish` handles this topologically. pnpm rewrites `workspace:*`
ranges to the real published versions at publish time, so source keeps using
`workspace:*`. Publishing uses npm **provenance** (set in each package's
`publishConfig`) and assumes an npm account with **2FA** / a CI automation token.

## License

[MIT](./LICENSE) © 2026 ISEMI
