import { describe, it, expect } from 'vitest';
import { renderTarget } from './renderTarget.js';
import { PHONE_ASPECT } from './primitives.js';
import type { StudioConfig, ResolvedTarget, PresetDrawApi } from './types.js';

/**
 * Fake 2D context rich enough for renderTarget. It records the `font` string in
 * effect at every fillText call, so we can assert the resolved brand font is the
 * one actually used to draw text (the wiring fix — previously brand.font was
 * ignored). measureText returns width = text length for deterministic wrapping.
 */
function makeCtx() {
  const fontsUsed: string[] = [];
  const grad = { addColorStop: () => {} };
  const ctx = {
    font: '',
    fillStyle: '' as string,
    strokeStyle: '' as string,
    lineWidth: 0,
    textAlign: '' as string,
    textBaseline: '' as string,
    shadowColor: '' as string,
    shadowBlur: 0,
    shadowOffsetY: 0,
    save() {},
    restore() {},
    translate() {},
    clip() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    arc() {},
    fill() {},
    stroke() {},
    fillRect() {},
    setLineDash() {},
    drawImage() {},
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: (t: string) => ({ width: t.length }),
    fillText(this: { font: string }) {
      fontsUsed.push(this.font);
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fontsUsed };
}

function cfg(font?: string): StudioConfig {
  return {
    brand: { name: 'T', colors: { primary: 'a', accent: 'b', bg: 'c', caption: 'white' }, ...(font ? { font } : {}) },
    background: { type: 'gradient', stops: ['x', 'y'] },
    targets: [],
  };
}

const target: ResolvedTarget = {
  store: 'appstore',
  id: 't',
  size: { w: 600, h: 1200 },
  frame: { type: 'none' },
  caption: { text: 'Hello world', position: 'top' },
};

describe('renderTarget font wiring', () => {
  it('uses the configured brand.font for caption text', () => {
    const { ctx, fontsUsed } = makeCtx();
    renderTarget(ctx, cfg("'TestFont', sans-serif"), target, {});
    expect(fontsUsed.length).toBeGreaterThan(0);
    expect(fontsUsed.some((f) => f.includes('TestFont'))).toBe(true);
  });

  it('falls back to the default bundled family (Inter), never a bare system stack', () => {
    const { ctx, fontsUsed } = makeCtx();
    renderTarget(ctx, cfg(), target, {});
    expect(fontsUsed.some((f) => f.includes('Inter'))).toBe(true);
    // must NOT silently use the system-only stack for caption text
    expect(fontsUsed.every((f) => !f.includes('-apple-system'))).toBe(true);
  });
});

describe('renderTarget scale unit (S / aspect / isWide)', () => {
  /** Render a bare (frame:none, no caption) target of the given size and capture the preset api. */
  function captureApi(w: number, h: number): PresetDrawApi {
    const { ctx } = makeCtx();
    let seen: PresetDrawApi | undefined;
    const t: ResolvedTarget = {
      store: 'appstore',
      id: 'cap',
      size: { w, h },
      frame: { type: 'none' },
      preset: 'cap',
    };
    renderTarget(ctx, cfg(), t, {}, { cap: (_g, api) => { seen = api; } });
    if (!seen) throw new Error('preset was not invoked');
    return seen;
  }

  it('is internally consistent: S = min(w, h*PHONE_ASPECT), isWide = aspect > PHONE_ASPECT', () => {
    const api = captureApi(1290, 2796);
    expect(api.aspect).toBeCloseTo(api.w / api.h, 10);
    expect(api.S).toBeCloseTo(Math.min(api.w, api.h * PHONE_ASPECT), 6);
    expect(api.isWide).toBe(api.aspect > PHONE_ASPECT);
  });

  it('phone target: S === w and not wide', () => {
    const api = captureApi(1290, 2796); // aspect ~0.46 < 0.58
    expect(api.isWide).toBe(false);
    expect(api.S).toBeCloseTo(api.w, 6);
  });

  it('tablet target: S === h*PHONE_ASPECT, S < w, and wide', () => {
    const api = captureApi(1600, 2560); // aspect 0.625 > 0.58
    expect(api.isWide).toBe(true);
    expect(api.S).toBeCloseTo(api.h * PHONE_ASPECT, 6);
    expect(api.S).toBeLessThan(api.w);
  });
});
