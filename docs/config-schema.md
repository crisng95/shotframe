# shotframe config schema

Every field of a shotframe config, derived from
[`packages/core/src/types.ts`](../packages/core/src/types.ts) (the TS shapes) and
validated at load by the zod schema in `@shotframe/config`.

A config is authored as `shotframe.config.ts` (typed, via `defineConfig`),
`.js`/`.mjs`, or `.json`. `.ts`/`.js` are loaded with [jiti](https://github.com/unjs/jiti)
(pure JS, no native binary); `.json` is parsed and zod-validated directly.

```ts
import { defineConfig } from '@shotframe/config';
export default defineConfig({ brand, background, targets, presets?, output? });
```

Top-level `StudioConfig`:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `brand` | `BrandConfig` | yes | Name + color palette + font. The single source of all brand values. |
| `background` | `BackgroundConfig` | yes | Global background; a target may override it per-target. |
| `targets` | `Target[]` | yes | What to render. Each → one output file. |
| `presets` | `PresetDef[]` | no | Path B synthetic-screen modules. |
| `output` | `{ dir; format?; quality? }` | no | Output directory + global format/quality defaults. `dir` defaults to `shotframe-out`. |

---

## BrandConfig

The engine carries no brand strings/colors/fonts as literals — they all come from here.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | `string` | yes | Display name (used by captions / presets). |
| `logo` | `string` | no | Path or URL; consumed by the preset/brand layer, not core. |
| `colors` | `{ primary; accent; bg; [k]: string }` | yes | `primary`, `accent`, `bg` guaranteed; add any extra named tokens. |
| `font` | `string` | no | Bundled webfont **family name** (e.g. `'Inter'`, `'Plus Jakarta Sans'`). Default **Inter**. The shell loads the bundled `woff2` before render, so output is deterministic across OS. |
| `fontFace` | `{ family; src; weights? }` | no | Register a **custom** (non-bundled) font face. `family` is the CSS family name, `src` a `woff2` path/URL (served like a source image), `weights?` a list of CSS weights (default: one variable `'100 900'` face). Set `font` to the same `family`. |

**Color tokens** the engine reads by name when present (all optional beyond the
three required): `bezel` (device frame), `placeholder` (empty screen fill),
`caption` (caption text), `muted`, and the browser-chrome tokens `chromeBar`,
`chromeBody`, `chromeUrlBar`. Presets receive the whole `colors` map as `tokens`.

```ts
brand: {
  name: 'My App',
  font: 'Plus Jakarta Sans', // bundled family; default Inter
  colors: { primary: '#2563eb', accent: '#7c5cff', bg: '#0a1124', bezel: '#05070d', caption: '#ffffff' },
}
```

**Fonts** are bundled as `woff2` in `@shotframe/fonts` and loaded before render,
so text metrics are identical on every OS. Bundled families (all OFL-1.1):
`Inter` (default), `Roboto`, `Montserrat`, `Poppins`, `Plus Jakarta Sans`,
`DM Sans`, `Space Grotesk`, `Sora`. For a non-bundled family, register it via
`brand.fontFace` and set `brand.font` to the same `family`. See the
[Fonts](../README.md#fonts) section.

---

## BackgroundConfig

Generalizes the mobile center-radial glow and the Chrome corner-vignette.

| Field | Type | Notes |
| --- | --- | --- |
| `type` | `'gradient' \| 'solid' \| 'image'` | required |
| `glowStyle` | `'center-radial' \| 'corner-vignette'` | `center-radial` = mobile; `corner-vignette` = CWS. |
| `stops` | `string[]` | gradient color stops (`type: 'gradient'`). |
| `glow` | `string` | radial glow color. |
| `color` | `string` | solid fill (`type: 'solid'`). |
| `image` | `string` | background image source id/path (`type: 'image'`). |

```ts
background: { type: 'gradient', glowStyle: 'center-radial', stops: ['#0a1124', '#0a0f1c'], glow: '#5b3df0' }
```

---

## FrameConfig

Four frame strategies.

| Field | Type | Applies to | Notes |
| --- | --- | --- | --- |
| `type` | `'canvas' \| 'image' \| 'browser' \| 'none'` | — | required |
| `radius` | `number` | `canvas` | corner radius as a **fraction of frame width** (e.g. `0.092`). |
| `island` | `'island' \| 'hole' \| 'none'` | `canvas` | notch variant. |
| `src` | `string` | `image` | your own device-frame PNG source id/path. |
| `url` | `string` | `browser` | URL-bar text. |

- `canvas` — parametric drawn bezel (MIT-safe; no trademarked assets).
- `browser` — browser chrome (traffic lights + URL bar) for Chrome Web Store.
- `image` — overlay a licensed device-frame PNG you provide.
- `none` — bare image (e.g. feature graphic / promo tiles).

---

## Target

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `store` | `'appstore' \| 'play' \| 'chrome'` | yes | Which store; also picks pack defaults. |
| `id` | `string` | yes | Stable id; the output filename. |
| `size` | `{ w: number; h: number }` | yes | **Exact** output pixels. |
| `frame` | `FrameConfig` | no | Defaults from the store pack. |
| `background` | `BackgroundConfig` | no | Per-target override of the global background. |
| `caption` | `CaptionConfig` | no | Headline drawn above/below the frame. |
| `output` | `OutputConfig` | no | Per-target format/quality override. |
| `source` | `string` | no | Path A: real screenshot to frame. |
| `preset` | `string` | no | Path B: preset id to draw (instead of a `source`). |

When you spread a built-in store pack, `size`/`frame`/`background`/`output` are
pre-filled; you typically only set `id`, `caption`, and `source`/`preset`.

### CaptionConfig

| Field | Type | Notes |
| --- | --- | --- |
| `text` | `string` | required; `\n` for explicit line breaks (also auto-wrapped). |
| `position` | `'top' \| 'bottom'` | default `top`. |
| `sizeMul` | `number` | headline size multiplier (default `1`). |
| `color` | `string` | defaults to the brand `caption` token. |

### OutputConfig

| Field | Type | Notes |
| --- | --- | --- |
| `format` | `'png' \| 'jpeg'` | resolution order: target → global `output` → store-pack default. |
| `quality` | `number` | JPEG quality `0–1` (default `0.94`). |

---

## PresetDef (Path B)

Registers a synthetic-screen module. The **shell** (CLI/studio) resolves
`module` to its default export and injects it; **core never imports it**.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | referenced by a target's `preset`. |
| `module` | `string` | path to a module (resolved relative to the config file) whose **default export** is a `PresetDrawFn`. |

A `PresetDrawFn` is `(ctx, { w, h, brand, tokens, prim }) => void`. It must be
**self-contained** (use only its arguments — `prim` is the core toolkit, `tokens`
is `brand.colors`) because only the function body is serialized into the browser
render realm. Type-only imports are erased and are fine. See
[`examples/basic/presets/hero.ts`](../examples/basic/presets/hero.ts).

---

## Worked example per store

```ts
import { defineConfig } from '@shotframe/config';

export default defineConfig({
  brand: {
    name: 'My App',
    colors: { primary: '#2563eb', accent: '#7c5cff', bg: '#0a1124', bezel: '#05070d', caption: '#ffffff', placeholder: '#0d1422', chromeBar: '#111a2c', chromeBody: '#0d1422' },
  },
  background: { type: 'gradient', glowStyle: 'center-radial', stops: ['#0a1124', '#0a0f1c'], glow: '#5b3df0' },
  output: { dir: './store-assets' },
  presets: [{ id: 'hero', module: './presets/hero.ts' }],
  targets: [
    // App Store — drawn iPhone bezel around a real screenshot
    {
      store: 'appstore',
      id: 'iphone69-1',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Frame your shots\nfor every store', position: 'top' },
      output: { format: 'jpeg', quality: 0.94 },
      source: './shots/home.png',
    },

    // App Store — Path B synthetic hero, no screenshot
    {
      store: 'appstore',
      id: 'iphone69-hero',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      preset: 'hero',
    },

    // Google Play — Android phone bezel
    {
      store: 'play',
      id: 'androidp-1',
      size: { w: 1080, h: 1920 },
      frame: { type: 'canvas', radius: 0.085, island: 'hole' },
      caption: { text: 'One config,\nthree stores', position: 'bottom' },
      output: { format: 'jpeg', quality: 0.94 },
      source: './shots/android.png',
    },

    // Chrome Web Store — browser chrome, PNG, corner-vignette background
    {
      store: 'chrome',
      id: 'screenshot-1',
      size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'myapp.example.com' },
      background: { type: 'gradient', glowStyle: 'corner-vignette', stops: ['#0b1226', '#070b14'], glow: '#1d4ed8' },
      output: { format: 'png' },
      source: './shots/web.png',
    },
  ],
});
```
