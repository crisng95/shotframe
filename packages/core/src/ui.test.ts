import { describe, it, expect } from 'vitest';
import { ui } from './index.js';

/**
 * A tiny fake 2D context that records mutations + calls — no jsdom / real canvas.
 * `measureText` returns width = text length so any auto-width math is deterministic.
 */
function makeFakeCtx() {
  const calls: string[] = [];
  const fills: string[] = [];
  const texts: string[] = [];
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}(${args.join(',')})`);
    };
  const grad = { addColorStop: rec('addColorStop') };
  const ctx = {
    calls,
    fills,
    texts,
    _fillStyle: '' as unknown,
    get fillStyle() {
      return this._fillStyle as string;
    },
    set fillStyle(v: unknown) {
      this._fillStyle = v;
      if (typeof v === 'string') fills.push(v);
    },
    strokeStyle: '' as string,
    lineWidth: 0,
    lineCap: '' as string,
    lineJoin: '' as string,
    font: '',
    textAlign: '' as string,
    textBaseline: '' as string,
    shadowColor: '' as string,
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: rec('save'),
    restore: rec('restore'),
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arcTo: rec('arcTo'),
    arc: rec('arc'),
    bezierCurveTo: rec('bezierCurveTo'),
    clip: rec('clip'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    fillRect: rec('fillRect'),
    fillText: (s: string, ...rest: unknown[]) => {
      texts.push(s);
      calls.push(`fillText(${s},${rest.join(',')})`);
    },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: (t: string) => ({ width: t.length }),
  };
  return ctx as unknown as CanvasRenderingContext2D & {
    calls: string[];
    fills: string[];
    texts: string[];
  };
}

describe('@shotframe/core ui kit', () => {
  it('exposes every documented component as a function', () => {
    for (const name of [
      'statusBar',
      'navBar',
      'tabBar',
      'card',
      'listRow',
      'button',
      'chip',
      'heading',
      'paragraph',
      'imageBox',
      'avatar',
      'progressBar',
      'badge',
      'iconGlyph',
    ] as const) {
      expect(typeof ui[name]).toBe('function');
    }
  });

  it('takes all colors from params (no color literals leak into fills)', () => {
    const ctx = makeFakeCtx();
    ui.card(ctx, 0, 0, 100, 60, { fill: 'rgb(1,2,3)', stroke: 'rgb(4,5,6)', shadow: 'rgb(7,8,9)' });
    // only the caller-supplied colors (and structural neutrals) should appear.
    expect(ctx.fills).toContain('rgb(1,2,3)');
    expect(ctx.fills.some((c) => c.startsWith('#'))).toBe(false);
  });

  it('button draws its label centered with the given color', () => {
    const ctx = makeFakeCtx();
    ui.button(ctx, 0, 0, 200, 50, { label: 'Go', fill: 'rgb(10,20,30)', color: 'rgb(255,255,255)' });
    expect(ctx.texts).toContain('Go');
    expect(ctx.fills).toContain('rgb(10,20,30)');
    expect(ctx.textAlign).toBe('center');
  });

  it('navBar returns a positive height and renders the title', () => {
    const ctx = makeFakeCtx();
    const hgt = ui.navBar(ctx, 0, 0, 390, { title: 'Home', color: 'rgb(0,0,0)', leading: 'chevron' });
    expect(hgt).toBeGreaterThan(0);
    expect(ctx.texts).toContain('Home');
  });

  it('chip auto-sizes width from its label and returns it', () => {
    const ctx = makeFakeCtx();
    const width = ui.chip(ctx, 0, 0, { label: 'hello', fill: 'rgb(1,1,1)', color: 'rgb(2,2,2)', h: 20, padX: 4 });
    // measureText('hello') = 5, + padX*2 = 8 -> 13
    expect(width).toBe(13);
  });

  it('progressBar clamps value to [0,1] and draws track + fill', () => {
    const ctx = makeFakeCtx();
    ui.progressBar(ctx, 0, 0, 100, { value: 2, track: 'rgb(9,9,9)', fill: 'rgb(3,3,3)' });
    expect(ctx.fills).toContain('rgb(9,9,9)');
    expect(ctx.fills).toContain('rgb(3,3,3)');
    // fill width is clamped to the full track width (100), not 200.
    expect(ctx.calls.some((c) => c.startsWith('fillRect') && c.includes('200'))).toBe(false);
  });

  it('iconGlyph draws each known icon via paths without throwing', () => {
    const ctx = makeFakeCtx();
    for (const name of ['chevron', 'plus', 'check', 'search', 'heart', 'star', 'bell', 'home'] as const) {
      ui.iconGlyph(ctx, 10, 10, 8, name, 'rgb(1,2,3)');
    }
    expect(ctx.calls.filter((c) => c === 'stroke()' || c === 'fill()').length).toBeGreaterThan(0);
  });

  it('listRow renders title/subtitle and an avatar initials block', () => {
    const ctx = makeFakeCtx();
    ui.listRow(ctx, 0, 0, 320, 64, {
      title: 'Ava',
      subtitle: 'online',
      leading: { fill: 'rgb(4,4,4)', initials: 'AV', color: 'rgb(5,5,5)' },
      trailing: 'chevron',
      colors: { title: 'rgb(0,0,0)', subtitle: 'rgb(6,6,6)' },
    });
    expect(ctx.texts).toEqual(expect.arrayContaining(['Ava', 'online', 'AV']));
  });
});
