/**
 * Path B preset loading (shell side).
 *
 * The core engine NEVER imports preset modules (purity / one-engine principle):
 * the SHELL resolves each `PresetDef.module` to its default-exported
 * `PresetDrawFn` and injects a `Record<id, PresetDrawFn>` into `renderTarget`.
 *
 * `renderTarget` runs inside the browser (the Playwright render page and the
 * studio UI), so the resolved functions can't be passed across that boundary as
 * live objects. Instead we load each module in Node (via jiti, so `.ts`/`.js`
 * both work), serialize the default export with `Function.prototype.toString()`,
 * and reconstruct it on the browser side with `new Function`.
 *
 * CONTRACT: a preset must be self-contained — it may use ONLY its injected
 * `(ctx, { w, h, brand, tokens, prim })` api and no module-scope closures, since
 * only the function body survives serialization.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import type { PresetDef } from '@shotframe/core';

/** Map of preset id -> serialized PresetDrawFn source (an expression string). */
export type PresetSourceMap = Record<string, string>;

/**
 * Load every configured preset module and return `{ id: fnSource }`.
 * `configDir` is the directory of the config file (preset `module` paths are
 * resolved relative to it).
 */
export async function loadPresetSources(
  presets: PresetDef[] | undefined,
  configDir: string,
): Promise<PresetSourceMap> {
  const out: PresetSourceMap = {};
  for (const def of presets ?? []) {
    const abs = resolve(configDir, def.module);
    const jiti = createJiti(pathToFileURL(abs).href);
    let mod: Record<string, unknown>;
    try {
      mod = (await jiti.import(abs)) as Record<string, unknown>;
    } catch (e) {
      throw new Error(
        `Failed to load preset "${def.id}" from ${def.module} (resolved ${abs}): ${(e as Error).message}`,
      );
    }
    const fn = mod && 'default' in mod ? mod.default : mod;
    if (typeof fn !== 'function') {
      throw new Error(
        `Preset "${def.id}" (${def.module}) must export a default function (PresetDrawFn).`,
      );
    }
    out[def.id] = fn.toString();
  }
  return out;
}
