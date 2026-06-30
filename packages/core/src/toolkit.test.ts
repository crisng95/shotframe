import { describe, it, expect } from 'vitest';
import { toolkit, wrapLines, pill, rb, withAlpha } from './index.js';

/**
 * A tiny fake 2D context that records calls — no jsdom / real canvas needed.
 * `measureText` returns width = text length, so wrapping is deterministic.
 */
function makeFakeCtx() {
  const calls: string[] = [];
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}(${args.join(',')})`);
    };
  const ctx = {
    calls,
    font: '',
    fillStyle: '' as string,
    strokeStyle: '' as string,
    lineWidth: 0,
    textAlign: '' as string,
    textBaseline: '' as string,
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arcTo: rec('arcTo'),
    arc: rec('arc'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    fillRect: rec('fillRect'),
    fillText: rec('fillText'),
    measureText: (t: string) => ({ width: t.length }),
  };
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] };
}

describe('@shotframe/core toolkit', () => {
  it('exposes the documented primitives', () => {
    expect(typeof toolkit.wrapLines).toBe('function');
    expect(typeof toolkit.pill).toBe('function');
    expect(typeof toolkit.rr).toBe('function');
    expect(typeof toolkit.scrBg).toBe('function');
    expect(typeof toolkit.fig).toBe('function');
    // named exports resolve to the same functions
    expect(toolkit.wrapLines).toBe(wrapLines);
    expect(toolkit.pill).toBe(pill);
  });

  it('wrapLines breaks words against the measured width', () => {
    const ctx = makeFakeCtx();
    // maxW = 5 chars; "aaa bbb ccc" -> "aaa", "bbb", "ccc"
    const lines = wrapLines(ctx, 'aaa bbb ccc', 5, 12, 600);
    expect(lines).toEqual(['aaa', 'bbb', 'ccc']);
    // a generous width keeps everything on one line
    expect(wrapLines(ctx, 'aa bb cc', 100, 12, 600)).toEqual(['aa bb cc']);
  });

  it('rb (pure rounded-fill helper) draws a closed path and fills', () => {
    const ctx = makeFakeCtx() as CanvasRenderingContext2D & { calls: string[] };
    rb(ctx, 0, 0, 20, 10, 4, 'rgba(1,2,3,1)');
    expect(ctx.calls).toContain('beginPath()');
    expect(ctx.calls).toContain('closePath()');
    expect(ctx.calls.filter((c) => c === 'fill()').length).toBe(1);
    expect(ctx.fillStyle).toBe('rgba(1,2,3,1)');
  });

  it('pill auto-sizes width from text when w is null and returns it', () => {
    const ctx = makeFakeCtx();
    const w = pill(ctx, 0, 0, null, 20, { fill: 'rgba(0,0,0,1)', text: 'hello', fontPx: 10, padX: 4 });
    // measureText("hello") = 5, + padX*2 = 8 -> 13
    expect(w).toBe(13);
  });

  it('withAlpha converts hex to rgba and passes non-hex through', () => {
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('#abc', 1)).toBe('rgba(170,187,204,1)');
    expect(withAlpha('transparent', 0.3)).toBe('transparent');
    expect(withAlpha('tomato', 0.3)).toBe('tomato');
  });
});
