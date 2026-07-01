---
'@shotframe/core': minor
'@shotframe/cli': minor
---

Expose a phone-scale unit on the preset API so wide targets fill the frame.

Presets now receive three extra fields on `api`:

- `S` — the phone-scale unit `min(w, h * PHONE_ASPECT)` (`PHONE_ASPECT = 0.58`, also
  exported). Size type, radii, strokes and circles by `S` while keeping positions and
  container widths on `w`/`h`. On phone targets `S === w` (no change); on wider tablet /
  iPad targets `S < w`, so text and round shapes stay proportionate while layouts still
  fill the frame edge-to-edge instead of collapsing into a squeezed center column.
- `aspect` — the screen aspect ratio `w / h`.
- `isWide` — `true` when `aspect > PHONE_ASPECT` (tablet / iPad).

The agent skill playbook (`shotframe init` / `shotframe skill` → `.claude/skills/shotframe/SKILL.md`)
and `AGENTS.md` now teach the "size by `S`, position by `w`/`h`" rule so redrawn presets fill
tablet/iPad targets by default.

Purely additive: existing presets that hand-roll their own scale unit keep working
unchanged.
