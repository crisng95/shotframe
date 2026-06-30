/**
 * The single source-of-truth zod schema for shotframe's `StudioConfig`.
 *
 * Two schemas live here:
 *   - `studioConfigSchema`     — a faithful mirror of @shotframe/core's `StudioConfig`
 *                                (targets carry an exact `size`). Its `z.infer` is
 *                                assignable to the core type (see schema.test.ts).
 *   - `studioConfigInputSchema` — the authoring/loader schema: it relaxes `targets`
 *                                so a user may reference a built-in store-target pack
 *                                and omit `id`/`size`, overriding only what they need.
 *
 * Keeping zod here (not in core) is deliberate: `@shotframe/core` stays zero-runtime-dep.
 */
import { z } from 'zod';

// --- leaf schemas (mirror core/types.ts) ----------------------------------

export const cornersSchema = z.object({
  tl: z.number(),
  tr: z.number(),
  br: z.number(),
  bl: z.number(),
});

export const radiusSchema = z.union([z.number(), cornersSchema]);

export const brandColorsSchema = z
  .object({
    primary: z.string(),
    accent: z.string(),
    bg: z.string(),
  })
  .catchall(z.string());

export const brandSchema = z.object({
  name: z.string(),
  logo: z.string().optional(),
  colors: brandColorsSchema,
  font: z.string().optional(),
  fontFace: z
    .object({
      family: z.string(),
      src: z.string(),
      weights: z.array(z.string()).optional(),
    })
    .optional(),
});

export const backgroundSchema = z.object({
  type: z.enum(['gradient', 'solid', 'image']),
  glowStyle: z.enum(['center-radial', 'corner-vignette']).optional(),
  stops: z.array(z.string()).optional(),
  glow: z.string().optional(),
  color: z.string().optional(),
  image: z.string().optional(),
});

export const frameSchema = z.object({
  type: z.enum(['canvas', 'image', 'browser', 'none']),
  radius: z.number().optional(),
  island: z.enum(['island', 'hole', 'none']).optional(),
  src: z.string().optional(),
  url: z.string().optional(),
});

export const captionSchema = z.object({
  text: z.string(),
  position: z.enum(['top', 'bottom']).optional(),
  sizeMul: z.number().optional(),
  color: z.string().optional(),
});

export const outputSchema = z.object({
  format: z.enum(['png', 'jpeg']).optional(),
  quality: z.number().optional(),
});

export const sizeSchema = z.object({
  w: z.number(),
  h: z.number(),
});

export const storeSchema = z.enum(['appstore', 'play', 'chrome', 'email']);

export const presetDefSchema = z.object({
  id: z.string(),
  module: z.string(),
});

export const studioOutputSchema = z.object({
  dir: z.string(),
  format: z.enum(['png', 'jpeg']).optional(),
  quality: z.number().optional(),
});

// --- strict target / config (mirror of core) ------------------------------

export const targetSchema = z.object({
  store: storeSchema,
  id: z.string(),
  size: sizeSchema,
  frame: frameSchema.optional(),
  background: backgroundSchema.optional(),
  caption: captionSchema.optional(),
  output: outputSchema.optional(),
  source: z.string().optional(),
  preset: z.string().optional(),
});

/** Canonical schema — mirrors `StudioConfig` from @shotframe/core 1:1. */
export const studioConfigSchema = z.object({
  brand: brandSchema,
  background: backgroundSchema,
  targets: z.array(targetSchema),
  presets: z.array(presetDefSchema).optional(),
  output: studioOutputSchema.optional(),
});

// --- relaxed authoring schema (pack-aware) --------------------------------

/**
 * Authoring target: `id` and `size` are optional so a user can reference a
 * store-target pack (e.g. `{ store: 'appstore' }` expands to every appstore
 * device) and override only the fields they care about.
 */
export const targetInputSchema = targetSchema.extend({
  id: z.string().optional(),
  size: sizeSchema.optional(),
});

/** Loader/authoring schema — what `loadConfig` and `defineConfig` accept. */
export const studioConfigInputSchema = studioConfigSchema.extend({
  targets: z.array(targetInputSchema),
});

// --- inferred types --------------------------------------------------------

export type ConfigInput = z.infer<typeof studioConfigInputSchema>;
export type TargetInput = z.infer<typeof targetInputSchema>;
export type StrictStudioConfig = z.infer<typeof studioConfigSchema>;
