import { describe, expect, it } from 'vitest';
import type { StudioConfig } from '@shotframe/core';
import {
  studioConfigSchema,
  studioConfigInputSchema,
  type StrictStudioConfig,
} from './schema.js';
import type { ResolvedStudioConfig } from './load.js';

// --- compile-time assertions (checked by `tsc --noEmit` in `pnpm typecheck`) ---
// If any IsAssignable resolves to `false`, `Expect<false>` is a type error.
type Expect<T extends true> = T;
type IsAssignable<A, B> = A extends B ? true : false;

// The schema's inferred type is assignable to core's StudioConfig (no drift).
export type _StrictMatchesCore = Expect<IsAssignable<StrictStudioConfig, StudioConfig>>;
// ...and a core StudioConfig is a valid input to the (relaxed) authoring schema.
export type _CoreIsValidInput = Expect<
  IsAssignable<StudioConfig, ReturnType<typeof asInput>>
>;
// A fully-resolved config is itself a valid core StudioConfig.
export type _ResolvedMatchesCore = Expect<IsAssignable<ResolvedStudioConfig, StudioConfig>>;
declare function asInput(): import('zod').infer<typeof studioConfigInputSchema>;

const validConfig = {
  brand: {
    name: 'Sample',
    colors: { primary: '#3aa0ff', accent: '#7c5cff', bg: '#0b1020' },
  },
  background: { type: 'gradient', stops: ['#0b1020', '#161c33'], glow: '#3aa0ff' },
  targets: [
    { store: 'appstore', id: 'iphone69', size: { w: 1290, h: 2796 }, source: 'a.png' },
  ],
  output: { dir: 'out', format: 'jpeg', quality: 0.94 },
};

describe('studioConfigSchema', () => {
  it('accepts a valid config', () => {
    const res = studioConfigSchema.safeParse(validConfig);
    expect(res.success).toBe(true);
  });

  it('rejects a wrong size type', () => {
    const bad = {
      ...validConfig,
      targets: [{ store: 'appstore', id: 'iphone69', size: { w: 'big', h: 2796 } }],
    };
    const res = studioConfigSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join('.').includes('size'))).toBe(true);
    }
  });

  it('rejects an unknown frame.type', () => {
    const bad = {
      ...validConfig,
      targets: [
        {
          store: 'appstore',
          id: 'iphone69',
          size: { w: 1290, h: 2796 },
          frame: { type: 'hologram' },
        },
      ],
    };
    const res = studioConfigSchema.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join('.').includes('frame'))).toBe(true);
    }
  });

  it('rejects a missing brand', () => {
    const { brand: _brand, ...rest } = validConfig;
    const res = studioConfigSchema.safeParse(rest);
    expect(res.success).toBe(false);
  });

  it('input schema allows pack reference (no id/size)', () => {
    const res = studioConfigInputSchema.safeParse({
      ...validConfig,
      targets: [{ store: 'chrome' }],
    });
    expect(res.success).toBe(true);
  });
});
