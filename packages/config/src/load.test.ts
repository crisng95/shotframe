import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, parseConfig } from './load.js';
import { ConfigError } from './errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => resolve(here, '../test/fixtures', name);

describe('loadConfig', () => {
  it('round-trips a sample .json and resolves targets', async () => {
    const cfg = await loadConfig(fixture('sample.config.json'));
    expect(cfg.brand.name).toBe('Sample App');
    // appstore iphone69 (explicit) + chrome pack (7) = 8 resolved targets
    expect(cfg.targets).toHaveLength(8);

    const iphone = cfg.targets.find((t) => t.id === 'iphone69');
    expect(iphone?.size).toEqual({ w: 1290, h: 2796 });
    expect(iphone?.source).toBe('shots/home.png');
    expect(iphone?.caption?.text).toBe('Solve any quiz');
    // global output.format (png) overrides the appstore pack default (jpeg)
    expect(iphone?.output).toMatchObject({ format: 'png' });

    const chromeShot = cfg.targets.find((t) => t.id === 'screenshot-1');
    expect(chromeShot?.size).toEqual({ w: 1280, h: 800 });
    expect(chromeShot?.frame).toMatchObject({ type: 'browser' });
  });

  it('loads a typed .ts config via jiti', async () => {
    const cfg = await loadConfig(fixture('sample.config.ts'));
    expect(cfg.brand.name).toBe('Sample App');
    expect(cfg.targets).toHaveLength(1);
    expect(cfg.targets[0].size).toEqual({ w: 1290, h: 2796 });
    expect(cfg.targets[0].frame).toMatchObject({ type: 'canvas' });
  });

  it('throws a structured ConfigError on schema violations', () => {
    expect(() =>
      parseConfig({
        brand: { name: 'x', colors: { primary: 'a', accent: 'b', bg: 'c' } },
        background: { type: 'gradient' },
        targets: [{ store: 'appstore', id: 'x', size: { w: 'nope', h: 1 } }],
      }),
    ).toThrow(ConfigError);
  });

  it('rejects an unsupported extension', async () => {
    await expect(loadConfig(fixture('nope.yaml'))).rejects.toBeInstanceOf(ConfigError);
  });
});
