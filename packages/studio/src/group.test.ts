import { describe, it, expect } from 'vitest';
import type { ResolvedTarget } from '@shotframe/core';
import { groupTargetsByStore, targetKey, sourceRefs } from './group.js';

function t(store: ResolvedTarget['store'], id: string, extra: Partial<ResolvedTarget> = {}): ResolvedTarget {
  return {
    store,
    id,
    size: { w: 100, h: 100 },
    frame: { type: 'none' },
    ...extra,
  };
}

describe('groupTargetsByStore', () => {
  it('groups by store in canonical order regardless of input order', () => {
    const groups = groupTargetsByStore([
      t('chrome', 'screenshot-1'),
      t('appstore', 'iphone69'),
      t('play', 'phone'),
      t('appstore', 'ipad13'),
    ]);
    expect(groups.map((g) => g.store)).toEqual(['appstore', 'play', 'chrome']);
    expect(groups[0].targets.map((x) => x.id)).toEqual(['iphone69', 'ipad13']);
    expect(groups[0].label).toBe('App Store');
    expect(groups[1].label).toBe('Google Play');
    expect(groups[2].label).toBe('Chrome Web Store');
  });

  it('omits stores with no targets', () => {
    const groups = groupTargetsByStore([t('play', 'phone')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].store).toBe('play');
  });

  it('preserves target order within a group', () => {
    const groups = groupTargetsByStore([t('appstore', 'a'), t('appstore', 'b'), t('appstore', 'c')]);
    expect(groups[0].targets.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('targetKey', () => {
  it('is unique per store+id', () => {
    expect(targetKey(t('appstore', 'iphone69'))).toBe('appstore/iphone69');
    expect(targetKey(t('play', 'iphone69'))).toBe('play/iphone69');
  });
});

describe('sourceRefs', () => {
  it('collects source, image-frame src and background image', () => {
    const target = t('chrome', 'x', {
      source: './shot.png',
      frame: { type: 'image', src: './frame.png' },
      background: { type: 'image', image: './bg.png' },
    });
    expect(sourceRefs(target)).toEqual(['./shot.png', './frame.png', './bg.png']);
  });

  it('falls back to the config-level background image', () => {
    const target = t('appstore', 'x');
    expect(sourceRefs(target, './global-bg.png')).toEqual(['./global-bg.png']);
  });

  it('returns empty when nothing is referenced', () => {
    expect(sourceRefs(t('appstore', 'x'))).toEqual([]);
  });
});
