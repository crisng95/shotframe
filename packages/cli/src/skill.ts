import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

export interface SkillOptions {
  dir?: string;
  force?: boolean;
}

/**
 * The agent skill written into a user's project at `.claude/skills/shotframe/SKILL.md`.
 * A Claude Code (or compatible) agent auto-discovers it and can then generate store
 * screenshots by redrawing the project's screens — no manual screenshots. Kept
 * self-contained: everything the agent needs is inline.
 */
export const SKILL_MD = `---
name: shotframe
description: >-
  Generate App Store / Google Play / Chrome Web Store screenshots for THIS project by
  redrawing its screens as shotframe presets — no manual screenshots. Use whenever the
  user asks to create, update, or refresh store screenshots, app-store assets, Play
  listing images, Chrome Web Store tiles, or marketing screenshots.
---

# shotframe — generate store screenshots from this project

You produce store-ready screenshots by **reading this project and redrawing its best
screens** with shotframe's injected UI kit. You do NOT ask the user to take screenshots.
The \`shotframe\` CLI is installed (\`shotframe --version\` to confirm; if missing, tell the
user to install it — see the repo README).

## Procedure

1. **Understand the app.** Read \`package.json\`/\`app.json\`/\`manifest.json\`/README for the
   name + value prop. Find the screens (routes/pages/\`screens\`/components) and note each
   screen's layout + real copy. Pick the **3–6 screens that sell the app** (hero feature,
   the "wow" moment, core loop) — never settings/empty states.
2. **Extract the brand.** Pull real colors from Tailwind config / CSS vars / theme tokens /
   \`app.json\`. Map to \`brand.colors\`: \`primary\`, \`accent\`, \`bg\`, \`caption\`, plus
   \`surface\`/\`muted\` as needed. Choose a bundled \`brand.font\` (Inter, Montserrat, Poppins,
   'Plus Jakarta Sans', 'DM Sans', 'Space Grotesk', Sora) matching the brand tone.
3. **Redraw each screen as a preset.** For each chosen screen write \`presets/<name>.ts\`:
   \`\`\`ts
   import type { PresetDrawFn } from '@shotframe/core';
   const screen: PresetDrawFn = (ctx, { w, h, brand, tokens, prim, font, ui }) => { /* draw */ };
   export default screen;
   \`\`\`
   Reconstruct the real screen (same nav bar / list / cards / hero, real-ish labels, brand
   colors) using \`api.ui\`. **The body MUST be self-contained** — no imports, no closures,
   no module-scope vars (it is serialized and rebuilt in the render realm; the \`import type\`
   line is erased). Take colors from \`tokens\`/\`brand.colors\`.
4. **Caption each screen** with one short marketing headline (drawn above the device).
5. **Config + render.** Write/extend \`shotframe.config.ts\`: \`brand\`, a gradient
   \`background\`, \`presets: [{ id, module }]\`, and one \`target\` per screen per store
   (\`preset: '<id>'\`, no \`source\`). Then run \`shotframe\`, open the outputs in
   \`./store-assets/\`, compare to the real screens, and iterate the presets until they look
   right. \`shotframe -t <id>\` re-renders one; \`shotframe list\` shows targets.

## \`api\` a preset receives
\`(ctx, { w, h, brand, tokens, prim, font, ui })\` — \`tokens\` = brand.colors by name;
\`prim\` = low-level (rr rb rs F tx wrap wrapLines pill sbar scrBg fig withAlpha);
\`font\` = resolved family (pass to every text component); \`ui\` = high-level components (prefer these):

\`\`\`
statusBar(g,x,y,w,{color,time?,family})
navBar(g,x,y,w,{title,color,align?,bg?,leading?,trailing?,family}) -> height
tabBar(g,x,y,w,h,{items:[{label,icon,active?}],color,activeColor,bg,family})
card(g,x,y,w,h,{fill,radius?,stroke?,shadow?})
listRow(g,x,y,w,h,{title,subtitle?,leading?:{fill,initials?,icon?,color?},trailing?,colors:{title,subtitle,trailing},divider?,family})
button(g,x,y,w,h,{label,fill,color,radius?,family})
chip(g,x,y,{label,fill,color,h?,family}) -> width
heading(g,x,y,{text,size,weight?,color,maxW?,family}) -> y-below
paragraph(g,x,y,{text,size,color,maxW,lineH?,family}) -> y-below
imageBox(g,x,y,w,h,{fill,radius?,icon?,iconColor?})
avatar(g,cx,cy,r,{fill,initials?,color?})
progressBar(g,x,y,w,{value,track,fill,h?})
badge(g,x,y,{label,fill,color,family})
iconGlyph(g,cx,cy,r,name,color)   name in chevron|plus|check|search|heart|star|bell|home
\`\`\`
Store sizes: App Store 1290×2796 (iPhone), 2064×2752 (iPad); Play 1080×1920 (phone),
1600×2560 (tablet), 1024×500 (feature graphic); Chrome 1280×800. A target per screen per store.

## Good store screens
Show the payoff (not navigation); one idea per screen echoed by the caption; use the app's
real entity names/labels; order to tell a story; match the app's real look. Open every
rendered file and refine until it reads like the real, polished screen.
`;

/** Write the agent skill into `.claude/skills/shotframe/SKILL.md`. */
export async function runSkill(opts: SkillOptions): Promise<{ skill: string }> {
  const dir = resolve(process.cwd(), opts.dir ?? '.');
  const skillPath = join(dir, '.claude', 'skills', 'shotframe', 'SKILL.md');
  if (existsSync(skillPath) && !opts.force) {
    throw new Error('.claude/skills/shotframe/SKILL.md already exists (use --force to overwrite)');
  }
  await mkdir(dirname(skillPath), { recursive: true });
  await writeFile(skillPath, SKILL_MD);
  return { skill: skillPath };
}
