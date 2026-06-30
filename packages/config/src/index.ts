/**
 * @shotframe/config — schema, loader and store-target packs for shotframe.
 *
 * Keeps @shotframe/core zero-runtime-dep: zod (validation) and jiti (.ts loading)
 * live here. The zod `studioConfigSchema` is the single source of truth and mirrors
 * core's `StudioConfig`; `defineConfig` is a typed identity helper for authors.
 */
import type { StudioConfig } from '@shotframe/core';

/**
 * Typed identity helper users import in their `shotframe.config.ts`:
 *
 * ```ts
 * import { defineConfig } from '@shotframe/config';
 * export default defineConfig({ brand, background, targets });
 * ```
 */
export function defineConfig(c: StudioConfig): StudioConfig {
  return c;
}

// Schema (single source of truth) + inferred types.
export {
  studioConfigSchema,
  studioConfigInputSchema,
  targetSchema,
  targetInputSchema,
  brandSchema,
  backgroundSchema,
  frameSchema,
  captionSchema,
  outputSchema,
  storeSchema,
  sizeSchema,
  presetDefSchema,
  studioOutputSchema,
  cornersSchema,
  radiusSchema,
  brandColorsSchema,
} from './schema.js';
export type { ConfigInput, TargetInput, StrictStudioConfig } from './schema.js';

// Built-in store-target packs.
export { STORE_PACKS, getStorePack } from './packs.js';
export type { StorePack, PackDevice, PackDefaults } from './packs.js';

// Target resolution + config loading.
export { resolveTargets } from './resolve.js';
export { loadConfig, parseConfig } from './load.js';
export type { ResolvedStudioConfig } from './load.js';

// Structured errors.
export { ConfigError } from './errors.js';
export type { ConfigIssue } from './errors.js';
