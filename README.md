# shotframe

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Turn real screenshots into store-ready assets — App Store, Google Play, Chrome
Web Store — at the exact pixel sizes each store requires, from one declarative
config. Built to be driven by an AI agent, not hand-operated.**

shotframe is a headless, config-driven tool. An agent writes a `shotframe.config.ts`,
runs `shotframe render`, and gets back dimension-exact PNG/JPEG files at deterministic
paths. No interactive setup, no per-OS surprises: the output bytes are reproducible
because fonts are bundled and the renderer reads the canvas buffer (not a viewport
screenshot).

> **For AI agents:** this README is the operating contract. Everything you need to
> author a config and run the tool is inline below — you do not need to open any
> other file. Sections you will use most: [Operating contract](#operating-contract),
> [Config schema](#config-schema-complete), [Commands](#commands), [Outputs](#outputs),
> [Failure modes & recovery](#failure-modes--recovery).

---

## Operating contract

```
INPUT   a shotframe.config.{ts,js,mjs,json}  (schema below) in the project root,
        + the real screenshot images it references (source: paths)
RUN     cd <project> && npx shotframe          # gen ALL targets (config auto-detected)
        npx shotframe -t <id> [<id>...]        # regenerate only these variants
        npx shotframe -s <store>               # regenerate only one store
        npx shotframe list                     # show every target id + size
        npx shotframe studio                   # live editor (human; long-lived server)
OUTPUT  <out>/<store>/<target.id>.<png|jpeg>   — one file per target,
        each at the target's exact pixel size (verifiable with `sips`/`sharp`)
EXIT    0 on success; non-zero on error with a one-line reason on stderr
DETERMINISM  same config + same images → same output bytes on macOS/Linux/Windows
```

`render` is the **default** command, so bare `shotframe` (no subcommand) generates
everything. `--out` is CWD-relative and overrides the config's `output.dir`.

A **target** = one output image. A store needing N screenshots = N targets with the
same `store`. Nothing is interactive; everything is declared in the config.

## Install

```bash
npm i -D @shotframe/cli      # or: pnpm add -D @shotframe/cli
npx playwright install chromium   # one-time; required by `render`
```

`@shotframe/core` and `@shotframe/config` are browser-target libraries with no browser
dependency to import; only `render` needs Chromium.

### Use without npm (GitHub release tarball)

shotframe is **not on the npm registry**. Install the self-contained tarball from
[GitHub Releases](https://github.com/crisng95/shotframe/releases) — no registry, no auth
token:

```bash
npm i -g https://github.com/crisng95/shotframe/releases/download/v0.1.0/shotframe-0.1.0.tgz
npx playwright install chromium     # one-time, for `render`
```

The tarball bundles `@shotframe/core`/`config`/`fonts` and pulls only public deps
(`commander`, `playwright`, `jiti`, `zod`). Then `cd` into any project and run `shotframe`.
Your config can still `import { defineConfig } from '@shotframe/config'` even though the
project hasn't installed it (the loader aliases it to a bundled shim); a `.json` config or a
plain `export default {…}` works too.

**From source (alternative):**

```bash
git clone https://github.com/crisng95/shotframe && cd shotframe
pnpm install && pnpm -r build && npx playwright install chromium
ln -sf "$PWD/packages/cli/dist/index.js" /usr/local/bin/shotframe   # a symlink on PATH
```

## Quickstart (minimal agent recipe)

1. Write `shotframe.config.ts`:

```ts
import { defineConfig } from '@shotframe/config';

export default defineConfig({
  brand: {
    name: 'My App',
    font: 'Inter', // a bundled family name (see Fonts); default Inter
    colors: { primary: '#2563eb', accent: '#7c5cff', bg: '#0a1124', bezel: '#05070d', caption: '#ffffff' },
  },
  background: { type: 'gradient', glowStyle: 'center-radial', stops: ['#0a1124', '#0a0f1c'], glow: '#5b3df0' },
  output: { dir: './store-assets' },
  targets: [
    { store: 'appstore', id: 'iphone69-1', size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Snap a question\nget the answer', position: 'top' },
      source: './shots/home.png' },
    { store: 'chrome', id: 'screenshot-1', size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'myapp.example.com' },
      output: { format: 'png' }, source: './shots/web.png' },
  ],
});
```

2. Generate (config auto-detected from cwd):

```bash
cd my-project
npx shotframe                       # → ./store-assets/<store>/<id>.<ext> for every target
npx shotframe -t iphone69-1         # regenerate just one variant
npx shotframe -s chrome             # regenerate just one store
npx shotframe list                  # what target ids exist?
```

## Commands

### `shotframe` (= `shotframe render`) — generate assets (default, primary entrypoint)

Bare `shotframe` renders **all** targets. It is the default command, so no subcommand
is needed. Runs every target through a Playwright-driven offscreen canvas and writes
`<out>/<store>/<id>.<ext>`. Loads the bundled `brand.font` before rendering so text wraps
identically everywhere. Completes and exits (no lingering process).

| Flag | Meaning |
| --- | --- |
| `-c, --config <path>` | Config file. Default: auto-detect `shotframe.config.{ts,js,mjs,json}` in cwd. |
| `-o, --out <dir>` | Output dir. **CWD-relative.** Overrides `output.dir` (config-relative). |
| `-s, --store <appstore\|play\|chrome\|email>` | Render only one store. |
| `-t, --target <ids...>` | Render only these target ids (regenerate specific variants). |

### `shotframe list` — discover target ids

Prints every target id + size, grouped by store, so you know what to pass to `-t`.

### `shotframe studio` — live browser editor (human/preview, not for headless agents)

```bash
npx shotframe studio --config ./shotframe.config.ts   # serves http://127.0.0.1:5179
```

A 3-pane UI (targets rail · live canvas · settings) for visual tweaking: edit captions,
drag-drop a real screenshot per target, pick a font, export manually. Edits are
**in-memory only** — never written back to the config (an agent owns the config file).
This command starts a long-lived server; **do not run it from an autonomous/headless
agent** (it does not exit) — use `render`.

## Config schema (complete)

Authored as `shotframe.config.ts` (typed, via `defineConfig`), `.js`/`.mjs`, or `.json`
(validated by zod on load). This is the entire surface — no other file needed.

```ts
StudioConfig = {
  brand: {
    name: string;
    font?: string;        // bundled family name (e.g. 'Inter', 'Plus Jakarta Sans'); default 'Inter'
    fontFace?: { family: string; src: string; weights?: string[] }; // custom woff2 (path/URL)
    logo?: string;        // consumed by presets, not the engine
    colors: {             // any extra named tokens allowed beyond these three
      primary: string; accent: string; bg: string;
      // common optional tokens the frames/captions read:
      bezel?; caption?; placeholder?; muted?;
      chromeBody?; chromeBar?; chromeUrlBar?;
    };
  };
  background: {           // global default; per-target `background` overrides it
    type: 'gradient' | 'solid' | 'image';
    glowStyle?: 'center-radial' | 'corner-vignette'; // mobile vs CWS look
    stops?: string[]; glow?: string; color?: string; image?: string;
  };
  output?: { dir: string; format?: 'png' | 'jpeg'; quality?: number };
  presets?: { id: string; module: string }[];   // Path B; module is config-relative
  targets: Target[];
}

Target = {
  store: 'appstore' | 'play' | 'chrome' | 'email';
  id: string;                       // becomes the output filename
  size: { w: number; h: number };   // exact output pixels
  frame?: {
    type: 'canvas' | 'browser' | 'image' | 'none';
    radius?: number;                // canvas: corner radius as a fraction of frame width
    island?: 'island' | 'hole' | 'none'; // canvas: notch style (iPhone / Android / none)
    url?: string;                   // browser: URL-bar text
    src?: string;                   // image: your own device-frame PNG (source id/path)
  };
  background?: BackgroundConfig;     // per-target override
  caption?: { text: string; position?: 'top' | 'bottom'; sizeMul?: number; color?: string };
  output?: { format?: 'png' | 'jpeg'; quality?: number };
  source?: string;                  // Path A: path to a REAL screenshot (config-relative)
  preset?: string;                  // Path B: preset id (no source needed)
}
```

`\n` in `caption.text` forces a line break. Paths in `source` / `presets[].module` /
`fontFace.src` are resolved **relative to the config file**.

### Built-in store packs (exact sizes)

`@shotframe/config` ships these sizes/defaults; declare a target per screenshot you need.

| Store | Target id(s) | Size (px) | Default frame | Default output |
| --- | --- | --- | --- | --- |
| `appstore` | `iphone69` | 1290 × 2796 | canvas bezel (island) | JPEG q0.94 |
| `appstore` | `ipad13` | 2064 × 2752 | canvas bezel (none) | JPEG q0.94 |
| `play` | `phone` | 1080 × 1920 | canvas bezel (hole) | JPEG q0.94 |
| `play` | `tablet` | 1600 × 2560 | canvas bezel (hole) | JPEG q0.94 |
| `play` | `feature-graphic` | 1024 × 500 | none | JPEG q0.94 |
| `chrome` | `screenshot-1…5` | 1280 × 800 | browser chrome | PNG |
| `chrome` | `small-promo` | 440 × 280 | none | PNG |
| `chrome` | `marquee` | 1400 × 560 | none | PNG |
| `email` | `preview` / `wide` | 1200 × 1600 / 1600 × 900 | none | PNG |

## Path A vs Path B

- **Path A — frame a real screenshot.** Set `source:` on a target; shotframe cover-fits
  the image into the chosen `frame`:
  - `canvas` — drawn device bezel (`radius`, `island`); MIT-safe, no trademarked PNGs.
  - `browser` — browser chrome (traffic lights + URL bar) for Chrome Web Store; set `url`.
  - `image` — your own licensed device-frame PNG via `src`.
  - `none` — bare image (feature graphic, email, promo).
- **Path B — synthetic preset (no screenshot).** Register `presets: [{ id, module }]` and
  set `preset:` on a target. The module default-exports a `PresetDrawFn` that draws using
  ONLY the injected toolkit (`prim`, `brand`, `tokens`, `font`) — it must be
  self-contained (it is serialized into the render realm; no module-scope imports/state).

```ts
import type { PresetDrawFn } from '@shotframe/core';
const hero: PresetDrawFn = (ctx, { w, h, brand, tokens, prim, font }) => {
  prim.scrBg(ctx, 0, 0, w, h, { bg: [tokens.bg, '#070b16'], glow: tokens.accent, radial: true });
  prim.tx(ctx, brand.name, w * 0.09, h * 0.18, w * 0.085, 800, tokens.caption, 'left', font);
};
export default hero;
```

## Fonts

shotframe **bundles** its webfonts (Latin `woff2` in `@shotframe/fonts`) and **loads the
selected family before rendering**, so text measures/wraps identically on every OS — the
output is deterministic, never dependent on host-installed fonts. Pick by name via
`brand.font` (default **Inter**, never a system fallback):

`Inter` · `Roboto` · `Montserrat` · `Poppins` · `Plus Jakarta Sans` · `DM Sans` ·
`Space Grotesk` · `Sora` — all OFL-1.1 (see [`@shotframe/fonts/LICENSES`](./packages/fonts/LICENSES)).

Custom family: point `brand.fontFace: { family, src }` at your own woff2 (path or URL).

## Outputs

- One file per target at `<out>/<store>/<id>.<ext>` (`ext` from the resolved output format).
- Each file is the target's **exact** `size` in pixels — guaranteed, because the renderer
  reads `canvas.toDataURL`/`toBlob` rather than screenshotting a viewport. Verify with
  `sips -g pixelWidth -g pixelHeight <file>` or `sharp`.
- Re-running with unchanged inputs reproduces the same bytes on the same platform; across
  platforms, dimensions are identical and pixels match within AA/emoji tolerance (fonts are
  bundled, so text metrics do not drift).

## Failure modes & recovery

| Symptom (stderr) | Cause | Fix |
| --- | --- | --- |
| `Could not launch Chromium … npx playwright install chromium` | Chromium not installed | run `npx playwright install chromium` |
| `Config not found: <path>` | bad `--config` or none in cwd | pass `--config`, or add `shotframe.config.ts` |
| `Source image not found: <ref>` | a `source:`/`frame.src` path is wrong | fix the path (config-relative) or create the image |
| `Cannot find module '@shotframe/config'` when loading a `.ts` config | config dir can't resolve the dep | run from a dir where `@shotframe/*` is installed (the project), not a temp dir |
| zod validation error listing a field path | config shape is invalid | correct the field per [Config schema](#config-schema-complete) |
| Output present but text looks wrong/clipped | font not loaded before measure | use a bundled `brand.font`, or supply `brand.fontFace`; `render` already awaits font load |

## How it works

`@shotframe/core` exposes one sync, pure function
`renderTarget(ctx, config, target, sources, presets)` composing
**background → frame → cover(source) | preset → caption** onto a 2D context. Both the
studio (`<canvas>`) and `render` (a Playwright offscreen `<canvas>`) call the **same**
engine and read the canvas buffer — output is dimension-exact and preview == file on the
same platform. The shell loads the bundled `brand.font` before the first `renderTarget`,
so text metrics (and bytes) are the same on every OS.

## Packages

| Package | What it is | Published |
| --- | --- | --- |
| [`@shotframe/core`](./packages/core) | Brand-free canvas engine + stable primitive toolkit. Zero runtime deps, browser-target. | ✅ |
| [`@shotframe/config`](./packages/config) | Zod schema, `defineConfig`, jiti config loader, built-in store packs. | ✅ |
| [`@shotframe/cli`](./packages/cli) | `shotframe render` / `shotframe studio`. Bundles the studio UI. | ✅ |
| [`@shotframe/fonts`](./packages/fonts) | Bundled OFL webfonts (woff2) + manifest for cross-OS determinism. | ✅ |
| `@shotframe/studio` | Vite browser editor (bundled inside the CLI). | ➖ private |

## Extending (agents working on this repo)

pnpm workspace. Verify with exiting commands only (never leave a server/browser running):

```bash
pnpm install
pnpm -r build && pnpm -r typecheck && pnpm -r test
node examples/basic/gen-shots.mjs   # regenerate sample inputs (gitignored)
node packages/cli/dist/index.js render --config examples/basic/shotframe.config.ts --out /tmp/out
```

- The engine is **brand-free**: no hex color literals or brand strings in `packages/core/src`
  (enforced by a test). All colors/fonts/copy arrive through the config.
- Releases use [changesets](https://github.com/changesets/changesets); publish order is
  `core → config → fonts → studio → cli` (`changeset publish` handles it topologically;
  `workspace:*` is rewritten to real versions at publish).

- **Requirements:** Node 20.6+ (`render` uses stable `import.meta.resolve`).

## License

[MIT](./LICENSE) © 2026 ISEMI. Bundled fonts keep their upstream OFL-1.1 licenses.
