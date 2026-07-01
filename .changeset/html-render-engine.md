---
'@shotframe/core': major
'@shotframe/cli': major
'@shotframe/config': major
---

Full-DOM HTML render engine (replaces the Canvas 2D engine).

The screen body — and the whole asset (background, device/browser frame, caption)
— is now built as an HTML/CSS string by the new pure, isomorphic `renderAsset()`
and rasterized by a real browser: the CLI screenshots it with Playwright, the
studio previews the same DOM and exports it (WYSIWYG — download is a reflow of
what you see). This yields real fonts, real `box-shadow`/`backdrop-filter` depth,
inline-SVG icons and real `<img>` photos, closing the "looks redrawn" gap.

BREAKING:
- The canvas `PresetDrawFn` API is removed. Path B presets now export an
  `HtmlPresetFn` — `(args) => string` returning the screen's inner HTML. The
  injected api is `{ w, h, brand, tokens, font, assets, ui }`; `ui` is an
  HTML component kit (returns strings), not canvas draw calls.
- `renderTarget(ctx, …)` is replaced by `renderAsset(cfg, target, opts): string`.
- The canvas primitive toolkit (`toolkit`, `rr`/`rb`/`tx`/…) and `Ctx`/
  `SourceImage(Map)` types are removed. Real screenshots (Path A `source`) are
  unchanged for config authors — they now render as an `<img>` cover.
- `@shotframe/core` is now platform-neutral (runs in Node and the browser).
