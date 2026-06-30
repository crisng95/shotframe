---
'@shotframe/core': minor
'@shotframe/config': minor
'@shotframe/cli': minor
'@shotframe/fonts': minor
---

Add font selection: bundled, cross-OS-deterministic webfonts.

shotframe now bundles eight OFL-1.1 webfonts as Latin-subset `woff2`
(`@shotframe/fonts`: Inter, Roboto, Montserrat, Poppins, Plus Jakarta Sans,
DM Sans, Space Grotesk, Sora) and **loads the face before rendering**, so text
metrics — and therefore the output bytes — are identical on every OS instead of
depending on whatever fonts the host has installed.

- `brand.font` selects a bundled family by name (default **Inter**); the engine
  draws every caption/preset text with it and never silently falls back to a
  system font.
- `brand.fontFace` (`{ family, src, weights? }`) registers a custom non-bundled
  `woff2`, loaded the same way before render.
- Presets receive the resolved family as `api.font` to pass to
  `prim.tx`/`prim.F`/`pill({ family })`.
- The studio adds a font picker for the bundled families.
