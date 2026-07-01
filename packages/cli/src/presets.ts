/**
 * Path B preset loading (shell side).
 *
 * The core engine NEVER imports preset modules (purity / one-engine principle):
 * the SHELL resolves each `PresetDef.module` to its default-exported
 * `HtmlPresetFn`. Two consumers:
 *   - the CLI renderer calls `renderAsset` in Node, so it needs LIVE functions
 *     (`loadPresetFns`).
 *   - the studio runs in the browser, so it needs each function SERIALIZED to a
 *     source string (`loadPresetSources`) which it reconstructs with `new Function`.
 *
 * CONTRACT: a preset must be self-contained — it may use ONLY its injected
 * `({ w, h, brand, tokens, font, assets, ui })` api and no module-scope closures,
 * since only the function body survives serialization.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import type { PresetDef, HtmlPresetFn } from '@shotframe/core';

/** Map of preset id -> serialized HtmlPresetFn source (an expression string). */
export type PresetSourceMap = Record<string, string>;

/** Load every configured preset module's default export as a live function. */
export async function loadPresetFns(
  presets: PresetDef[] | undefined,
  configDir: string,
): Promise<Record<string, HtmlPresetFn>> {
  const out: Record<string, HtmlPresetFn> = {};
  for (const def of presets ?? []) {
    out[def.id] = (await loadPreset(def, configDir)) as HtmlPresetFn;
  }
  return out;
}

/** Load every configured preset module and return `{ id: fnSource }` (for the studio). */
export async function loadPresetSources(
  presets: PresetDef[] | undefined,
  configDir: string,
): Promise<PresetSourceMap> {
  const out: PresetSourceMap = {};
  for (const def of presets ?? []) {
    out[def.id] = (await loadPreset(def, configDir)).toString();
  }
  return out;
}

async function loadPreset(def: PresetDef, configDir: string): Promise<(...a: unknown[]) => unknown> {
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
      `Preset "${def.id}" (${def.module}) must export a default function (HtmlPresetFn).`,
    );
  }
  return fn as (...a: unknown[]) => unknown;
}
