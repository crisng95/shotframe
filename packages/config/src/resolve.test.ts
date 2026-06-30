import { describe, expect, it } from 'vitest';
import { resolveTargets } from './resolve.js';
import { ConfigError } from './errors.js';
import type { ConfigInput } from './schema.js';

const baseCfg: Omit<ConfigInput, 'targets'> = {
  brand: {
    name: 'Sample',
    colors: { primary: '#3aa0ff', accent: '#7c5cff', bg: '#0b1020' },
  },
  background: { type: 'gradient', stops: ['#0b1020', '#161c33'], glow: '#3aa0ff' },
};

function cfg(targets: ConfigInput['targets']): ConfigInput {
  return { ...baseCfg, targets };
}

const sizeOf = (t: { size: { w: number; h: number } }) => `${t.size.w}x${t.size.h}`;

describe('resolveTargets — store pack expansion to exact pixels', () => {
  it('expands appstore pack', () => {
    const out = resolveTargets(cfg([{ store: 'appstore' }]));
    expect(out.map((t) => `${t.id}:${sizeOf(t)}`)).toEqual([
      'iphone69:1290x2796',
      'ipad13:2064x2752',
    ]);
    // per-device frame radius/island survive
    expect(out[0].frame).toMatchObject({ type: 'canvas', radius: 0.092, island: 'island' });
    expect(out[1].frame).toMatchObject({ type: 'canvas', radius: 0.045, island: 'none' });
    // store defaults: jpeg 0.94 + center-radial glow
    expect(out[0].output).toMatchObject({ format: 'jpeg', quality: 0.94 });
    expect(out[0].background).toMatchObject({ glowStyle: 'center-radial' });
  });

  it('expands play pack', () => {
    const out = resolveTargets(cfg([{ store: 'play' }]));
    expect(out.map((t) => `${t.id}:${sizeOf(t)}`)).toEqual([
      'phone:1080x1920',
      'tablet:1600x2560',
      'feature-graphic:1024x500',
    ]);
    expect(out[0].frame).toMatchObject({ type: 'canvas', radius: 0.085, island: 'hole' });
    expect(out[1].frame).toMatchObject({ type: 'canvas', radius: 0.05, island: 'hole' });
    // feature-graphic overrides frame to 'none'
    expect(out[2].frame).toMatchObject({ type: 'none' });
    expect(out[0].output).toMatchObject({ format: 'jpeg', quality: 0.94 });
  });

  it('expands chrome pack', () => {
    const out = resolveTargets(cfg([{ store: 'chrome' }]));
    expect(out.map((t) => `${t.id}:${sizeOf(t)}`)).toEqual([
      'screenshot-1:1280x800',
      'screenshot-2:1280x800',
      'screenshot-3:1280x800',
      'screenshot-4:1280x800',
      'screenshot-5:1280x800',
      'small-promo:440x280',
      'marquee:1400x560',
    ]);
    // screenshots get a browser frame + PNG + corner-vignette glow
    expect(out[0].frame).toMatchObject({ type: 'browser' });
    expect(out[0].output).toMatchObject({ format: 'png' });
    expect(out[0].background).toMatchObject({ glowStyle: 'corner-vignette' });
    // promos drop the frame
    expect(out[5].frame).toMatchObject({ type: 'none' });
    expect(out[6].frame).toMatchObject({ type: 'none' });
  });

  it('expands all three packs together to 12 targets', () => {
    const out = resolveTargets(
      cfg([{ store: 'appstore' }, { store: 'play' }, { store: 'chrome' }]),
    );
    expect(out).toHaveLength(2 + 3 + 7);
  });

  it('narrows to a single device by id and merges global background', () => {
    const out = resolveTargets(
      cfg([{ store: 'appstore', id: 'ipad13', source: 'ipad.png' }]),
    );
    expect(out).toHaveLength(1);
    expect(sizeOf(out[0])).toBe('2064x2752');
    expect(out[0].source).toBe('ipad.png');
    // global gradient stops flow through; pack glowStyle remains
    expect(out[0].background).toMatchObject({
      type: 'gradient',
      stops: ['#0b1020', '#161c33'],
      glowStyle: 'center-radial',
    });
  });

  it('honours per-target overrides over pack defaults', () => {
    const out = resolveTargets(
      cfg([
        {
          store: 'appstore',
          id: 'iphone69',
          output: { format: 'png' },
          background: { type: 'solid', color: '#000000' },
          frame: { type: 'image', src: 'bezel.png' },
        },
      ]),
    );
    expect(out[0].output).toMatchObject({ format: 'png' });
    expect(out[0].background).toMatchObject({ type: 'solid', color: '#000000' });
    expect(out[0].frame).toMatchObject({ type: 'image', src: 'bezel.png' });
  });

  it('accepts an explicit custom size without a matching device id', () => {
    const out = resolveTargets(
      cfg([{ store: 'appstore', id: 'custom', size: { w: 1242, h: 2688 } }]),
    );
    expect(sizeOf(out[0])).toBe('1242x2688');
    expect(out[0].id).toBe('custom');
  });

  it('throws a structured error for an unknown device id', () => {
    expect(() => resolveTargets(cfg([{ store: 'play', id: 'nope' }]))).toThrow(ConfigError);
    try {
      resolveTargets(cfg([{ store: 'play', id: 'nope' }]));
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).issues[0].path).toContain('targets[0].id');
    }
  });
});
