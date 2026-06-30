/**
 * Built-in store-target packs.
 *
 * Each pack ships as DATA so a user only overrides what they need: per-store
 * sensible defaults (frame type, output format/quality, background glow style)
 * plus the exact device pixel sizes each store requires. These come straight
 * from the plan's Gap 1/2/3 (per-target background, frame type, output format).
 */
import type {
  BackgroundConfig,
  FrameConfig,
  OutputConfig,
  Store,
} from '@shotframe/core';

/** One concrete device/asset slot inside a store pack. */
export interface PackDevice {
  /** Stable target id, e.g. 'iphone69' | 'screenshot-1' | 'feature-graphic'. */
  id: string;
  /** Exact store pixels. */
  size: { w: number; h: number };
  /** Device-specific frame (overrides the pack's default frame). */
  frame?: FrameConfig;
}

/** Per-store defaults applied to every device unless overridden. */
export interface PackDefaults {
  frame: FrameConfig;
  background: BackgroundConfig;
  output: OutputConfig;
}

export interface StorePack {
  store: Store;
  defaults: PackDefaults;
  devices: PackDevice[];
}

/** 5 Chrome Web Store screenshots, all 1280×800 with a browser frame. */
const chromeScreenshots: PackDevice[] = Array.from({ length: 5 }, (_, i) => ({
  id: `screenshot-${i + 1}`,
  size: { w: 1280, h: 800 },
  frame: { type: 'browser' },
}));

export const STORE_PACKS: Record<Store, StorePack> = {
  appstore: {
    store: 'appstore',
    defaults: {
      frame: { type: 'canvas' },
      background: { type: 'gradient', glowStyle: 'center-radial' },
      output: { format: 'jpeg', quality: 0.94 },
    },
    devices: [
      {
        id: 'iphone69',
        size: { w: 1290, h: 2796 },
        frame: { type: 'canvas', radius: 0.092, island: 'island' },
      },
      {
        id: 'ipad13',
        size: { w: 2064, h: 2752 },
        frame: { type: 'canvas', radius: 0.045, island: 'none' },
      },
    ],
  },
  play: {
    store: 'play',
    defaults: {
      frame: { type: 'canvas' },
      background: { type: 'gradient', glowStyle: 'center-radial' },
      output: { format: 'jpeg', quality: 0.94 },
    },
    devices: [
      {
        id: 'phone',
        size: { w: 1080, h: 1920 },
        frame: { type: 'canvas', radius: 0.085, island: 'hole' },
      },
      {
        id: 'tablet',
        size: { w: 1600, h: 2560 },
        frame: { type: 'canvas', radius: 0.05, island: 'hole' },
      },
      {
        id: 'feature-graphic',
        size: { w: 1024, h: 500 },
        frame: { type: 'none' },
      },
    ],
  },
  chrome: {
    store: 'chrome',
    defaults: {
      frame: { type: 'browser' },
      background: { type: 'gradient', glowStyle: 'corner-vignette' },
      output: { format: 'png' },
    },
    devices: [
      ...chromeScreenshots,
      { id: 'small-promo', size: { w: 440, h: 280 }, frame: { type: 'none' } },
      { id: 'marquee', size: { w: 1400, h: 560 }, frame: { type: 'none' } },
    ],
  },
  // Email is a "screenshot" store: drop a captured email image, frame it lightly
  // (no device bezel) on a branded background + caption. 2× of a 600px email body.
  email: {
    store: 'email',
    defaults: {
      frame: { type: 'none' },
      background: { type: 'gradient', glowStyle: 'center-radial' },
      output: { format: 'png' },
    },
    devices: [
      { id: 'preview', size: { w: 1200, h: 1600 }, frame: { type: 'none' } },
      { id: 'wide', size: { w: 1600, h: 900 }, frame: { type: 'none' } },
    ],
  },
};

/** Look up a pack by store id. */
export function getStorePack(store: Store): StorePack {
  return STORE_PACKS[store];
}
