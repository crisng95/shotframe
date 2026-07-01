import { describe, it, expect } from 'vitest';
import { renderAsset } from './renderAsset.js';
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

function target(over: Partial<ResolvedTarget> = {}): ResolvedTarget {
  return {
    store: 'appstore',
    id: 't1',
    size: { w: 1290, h: 2796 },
    frame: { type: 'canvas', radius: 0.092, island: 'island' },
    caption: { text: 'A quiet feed\nthat teaches', position: 'top' },
    ...over,
  } as ResolvedTarget;
}

describe('renderAsset', () => {
  it('emits an #asset sized exactly to the target', () => {
    const html = renderAsset(cfg, target());
    expect(html).toContain('id="asset"');
    expect(html).toContain('width:1290px');
    expect(html).toContain('height:2796px');
  });

  it('never emits canvas/DOM API calls (pure string builder)', () => {
    const html = renderAsset(cfg, target());
    expect(html).not.toMatch(/getContext|fillRect|toDataURL/);
  });

  it('Path B: calls the preset and inlines its HTML', () => {
    const preset: HtmlPresetFn = ({ w, h }) => `<div class="mark">screen ${w}x${h}</div>`;
    const html = renderAsset(cfg, target(), { presets: { home: preset } as Record<string, HtmlPresetFn>, sources: {} });
    // preset id must match target.preset
    const html2 = renderAsset(cfg, target({ preset: 'home' }), { presets: { home: preset } });
    expect(html2).toContain('class="mark"');
    void html;
  });

  it('Path A: renders a real screenshot as an <img> cover', () => {
    const html = renderAsset(cfg, target({ source: 'shot' }), { sources: { shot: 'http://x/shot.png' } });
    expect(html).toContain('<img src="http://x/shot.png"');
    expect(html).toContain('object-fit:cover');
  });

  it('renders the caption lines', () => {
    const html = renderAsset(cfg, target());
    expect(html).toContain('A quiet feed');
    expect(html).toContain('that teaches');
  });

  it('device frame uses the bezel color + metallic rail', () => {
    const html = renderAsset(cfg, target());
    expect(html).toContain('#04130C'); // bezel token
    expect(html).toContain('rgba(255,255,255,.55)'); // outer metallic rail
  });

  it('quotes spaced font families with single quotes (no attribute break)', () => {
    const c2: StudioConfig = { ...cfg, brand: { ...brand, font: 'Plus Jakarta Sans' } };
    const html = renderAsset(c2, target());
    // a double-quoted family would prematurely close style="..." and drop later decls
    expect(html).not.toContain('font-family:"');
    expect(html).toContain("font-family:'Plus Jakarta Sans'");
    // caption size must survive after the family declaration
    expect(html).toMatch(/font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:\d+px/);
  });

  it('hole-punch notch renders a circle', () => {
    const html = renderAsset(cfg, target({ frame: { type: 'canvas', island: 'hole' } }));
    expect(html).toContain('border-radius:50%');
  });
});
