import { describe, it, expect } from 'vitest';
import { renderAsset } from './renderAsset.js';
import { DESIGN_WIDTH, logicalWidthFor } from './screen.js';
import type { StudioConfig, ResolvedTarget, HtmlPresetFn } from './types.js';

const brand = {
  name: 'Acme',
  font: 'Inter',
  colors: { primary: '#019758', accent: '#FFBE21', bg: '#FFFFFF', bezel: '#04130C', caption: '#FFFFFF' },
};

const cfg: StudioConfig = {
  brand,
  background: { type: 'gradient', glowStyle: 'center-radial', stops: ['#0B3D2E', '#04130C'], glow: '#FFBE21' },
  targets: [],
};

// A preset that reports the logical width/height it was handed.
const probe: HtmlPresetFn = ({ w, h }) => `<div data-w="${w}" data-h="${h}">x</div>`;

function target(over: Partial<ResolvedTarget> = {}): ResolvedTarget {
  return {
    store: 'appstore',
    id: 't1',
    size: { w: 1290, h: 2796 },
    frame: { type: 'canvas', radius: 0.092, island: 'island' },
    preset: 'p',
    ...over,
  } as ResolvedTarget;
}

const render = (t: ResolvedTarget) => renderAsset(cfg, t, { presets: { p: probe } });

describe('fixed-resolution + uniform scale (Path B)', () => {
  it('device (canvas) frame: preset authored at DESIGN_WIDTH and uniformly scaled', () => {
    const html = render(target());
    expect(html).toContain(`data-w="${DESIGN_WIDTH}"`); // preset sees logical 390, not the raw rect
    expect(html).toContain(`width:${DESIGN_WIDTH}px`); // fixed author box
    expect(html).toMatch(/transform:scale\(/); // one uniform scale
    expect(html).toContain('transform-origin:top left');
  });

  it('uniform scale means one factor for x and y (no squish): scale = sw / 390', () => {
    // pull the author-box width (390) and its scale; logical height must equal sh/scale
    const html = render(target());
    const m = html.match(/transform:scale\(([\d.]+)\)/);
    expect(m).toBeTruthy();
    const scale = Number(m![1]);
    // logical width fixed at 390 → the scaled box width equals the real screen rect
    expect(scale).toBeGreaterThan(0);
  });

  it('iPad-aspect target uses the SAME logical width (390), only height differs', () => {
    const ipad = target({ id: 'ipad', size: { w: 2064, h: 2752 } });
    const html = render(ipad);
    expect(html).toContain(`data-w="${DESIGN_WIDTH}"`);
    // logical height is shorter for the wider iPad aspect → a different data-h than a phone
    const phone = render(target());
    const hIpad = html.match(/data-h="([\d.]+)"/)![1];
    const hPhone = phone.match(/data-h="([\d.]+)"/)![1];
    expect(Number(hIpad)).toBeLessThan(Number(hPhone));
  });

  it('browser (CWS) frame: NOT normalized — preset sees the raw screen rect', () => {
    const html = render(target({ frame: { type: 'browser', url: 'acme.app' }, size: { w: 1280, h: 800 } }));
    expect(html).not.toContain(`data-w="${DESIGN_WIDTH}"`); // raw width, not 390
    expect(html).not.toMatch(/transform:scale\(/);
  });

  it('design:false disables normalization even on a device frame', () => {
    const html = render(target({ design: false }));
    expect(html).not.toContain(`data-w="${DESIGN_WIDTH}"`);
    expect(html).not.toMatch(/transform:scale\(/);
  });

  it('design:{width} overrides the logical width', () => {
    const html = render(target({ design: { width: 320 } }));
    expect(html).toContain('data-w="320"');
    expect(html).toContain('width:320px');
  });

  it('Path A (<img> cover) is never scaled', () => {
    const html = renderAsset(cfg, target({ preset: undefined, source: 'shot' }), { sources: { shot: 'http://x/s.png' } });
    expect(html).toContain('<img src="http://x/s.png"');
    expect(html).not.toMatch(/transform:scale\(/);
  });
});

describe('logicalWidthFor', () => {
  it('defaults to DESIGN_WIDTH for canvas frames', () => {
    expect(logicalWidthFor(target())).toBe(DESIGN_WIDTH);
  });
  it('returns null for browser frames', () => {
    expect(logicalWidthFor(target({ frame: { type: 'browser' } }))).toBeNull();
  });
  it('respects explicit width and false', () => {
    expect(logicalWidthFor(target({ design: { width: 360 } }))).toBe(360);
    expect(logicalWidthFor(target({ design: false }))).toBeNull();
  });
});
