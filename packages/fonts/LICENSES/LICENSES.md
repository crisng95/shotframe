# Bundled font licenses

The `@shotframe/fonts` **package code** is MIT (see the repository root `LICENSE`).

Each font bundled in `../fonts/*.woff2` keeps its own upstream license, listed
below. The full license texts are in this directory. All woff2 files are the
**Latin** subset, sourced from the [Fontsource](https://fontsource.org) CDN
(jsDelivr npm packages `@fontsource-variable/*` and `@fontsource/*`).

| Font | id | License | Variant | Files | License text |
| --- | --- | --- | --- | --- | --- |
| Inter | `inter` | OFL-1.1 | variable (wght 100–900) | `inter.woff2` | [OFL-Inter.txt](./OFL-Inter.txt) |
| Roboto | `roboto` | OFL-1.1 | static 400 + 700 | `roboto-400.woff2`, `roboto-700.woff2` | [LICENSE-Roboto.txt](./LICENSE-Roboto.txt) |
| Montserrat | `montserrat` | OFL-1.1 | variable (wght 100–900) | `montserrat.woff2` | [OFL-Montserrat.txt](./OFL-Montserrat.txt) |
| Poppins | `poppins` | OFL-1.1 | static 400 + 700 | `poppins-400.woff2`, `poppins-700.woff2` | [OFL-Poppins.txt](./OFL-Poppins.txt) |
| Plus Jakarta Sans | `plus-jakarta-sans` | OFL-1.1 | variable (wght 200–800) | `plus-jakarta-sans.woff2` | [OFL-PlusJakartaSans.txt](./OFL-PlusJakartaSans.txt) |
| DM Sans | `dm-sans` | OFL-1.1 | variable (wght 100–1000) | `dm-sans.woff2` | [OFL-DMSans.txt](./OFL-DMSans.txt) |
| Space Grotesk | `space-grotesk` | OFL-1.1 | variable (wght 300–700) | `space-grotesk.woff2` | [OFL-SpaceGrotesk.txt](./OFL-SpaceGrotesk.txt) |
| Sora | `sora` | OFL-1.1 | variable (wght 100–800) | `sora.woff2` | [OFL-Sora.txt](./OFL-Sora.txt) |

## Notes

- **Variable vs static.** Fontsource publishes Latin variable woff2 for Inter,
  Montserrat, Plus Jakarta Sans, DM Sans, Space Grotesk and Sora. **Poppins** has
  no variable build, so it ships as static **400 + 700**. **Roboto** ships as
  static **400 + 700** (the `roboto-flex` variable build is a different family,
  "Roboto Flex", so it was not used here to keep the CSS family name accurate as
  "Roboto").
- **Roboto license.** Modern Roboto (the `googlefonts/roboto-classic` project
  distributed by Fontsource) is licensed under **OFL-1.1**, not Apache-2.0. The
  bundled `LICENSE-Roboto.txt` is the OFL-1.1 text shipped with that package.

## Sources

All files were fetched from the jsDelivr npm mirror of Fontsource:

- Variable woff2: `https://cdn.jsdelivr.net/npm/@fontsource-variable/<id>@latest/files/<id>-latin-wght-normal.woff2`
- Static woff2: `https://cdn.jsdelivr.net/npm/@fontsource/<id>@latest/files/<id>-latin-<weight>-normal.woff2`
- License texts: `https://cdn.jsdelivr.net/npm/<pkg>@latest/LICENSE`

Upstream font projects:

- Inter — https://github.com/rsms/inter
- Roboto — https://github.com/googlefonts/roboto-classic
- Montserrat — https://github.com/JulietaUla/Montserrat
- Poppins — https://github.com/itfoundry/Poppins
- Plus Jakarta Sans — https://github.com/tokotype/PlusJakartaSans
- DM Sans — https://github.com/googlefonts/dm-fonts
- Space Grotesk — https://github.com/floriankarsten/space-grotesk
- Sora — https://github.com/soraxas/sora (Jonny Pinhorn / Google Fonts)
