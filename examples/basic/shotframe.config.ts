import { defineConfig } from '@shotframe/config';

/**
 * Example shotframe config. Run from this folder:
 *   node ../../packages/cli/dist/index.js render --config ./shotframe.config.ts --out ./out
 *
 * Path A (real screenshots): each framed target points `source` at a real image in ./shots.
 * The store target packs supply exact pixel sizes & sensible per-store defaults.
 */
export default defineConfig({
  brand: {
    name: 'Demo',
    // Use a bundled webfont (shipped as woff2 in @shotframe/fonts and loaded
    // before render) so captions + the synthetic hero screen render identically
    // on every OS — no reliance on whatever fonts the host machine has.
    font: 'Plus Jakarta Sans',
    colors: {
      primary: '#2563eb',
      accent: '#7c5cff',
      bg: '#0a1124',
      bezel: '#05070d',
      caption: '#ffffff',
      placeholder: '#0d1422',
      chromeBar: '#111a2c',
      chromeBody: '#0d1422',
    },
  },
  background: {
    type: 'gradient',
    glowStyle: 'center-radial',
    stops: ['#0a1124', '#0a0f1c'],
    glow: '#5b3df0',
  },
  output: { dir: './out' },
  // Path B: register synthetic-screen presets. The CLI/studio resolve each
  // `module` (relative to this config file) to its default-exported PresetDrawFn.
  presets: [
    { id: 'hero', module: './presets/hero.ts' },
    { id: 'appdemo', module: './presets/appdemo.ts' },
  ],
  targets: [
    // ── App Store: a store needs MANY screenshots — each one is its own target
    //    with the same `store`, so the studio rail groups them under "App Store".
    {
      store: 'appstore',
      id: 'iphone69-1',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Frame your shots\nfor every store', position: 'top' },
      source: './shots/phone-1.png',
    },
    {
      store: 'appstore',
      id: 'iphone69-2',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'One config,\nevery size', position: 'top' },
      source: './shots/phone-3.png',
    },
    {
      store: 'appstore',
      id: 'iphone69-3',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Pixel-exact\nexports', position: 'top' },
      source: './shots/phone-4.png',
    },
    // App Store — Path B: a synthetic "hero" screen (NO source image) drawn by
    // the `hero` preset, wrapped in the same drawn device bezel.
    {
      store: 'appstore',
      id: 'iphone69-hero',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'No screenshot needed', position: 'top' },
      preset: 'hero',
    },
    // App Store — Path B: a believable app HOME screen redrawn ENTIRELY with the
    // injected high-level UI kit (`api.ui`), no real screenshot.
    {
      store: 'appstore',
      id: 'appdemo',
      size: { w: 1290, h: 2796 },
      frame: { type: 'canvas', radius: 0.092, island: 'island' },
      caption: { text: 'Redrawn with the UI kit', position: 'top' },
      preset: 'appdemo',
    },
    // App Store — iPad 13" (different size + flatter corners, no island)
    {
      store: 'appstore',
      id: 'ipad13-1',
      size: { w: 2064, h: 2752 },
      frame: { type: 'canvas', radius: 0.045, island: 'none' },
      caption: { text: 'Looks great on iPad', position: 'top' },
      source: './shots/ipad-1.png',
    },
    // ── Google Play: multiple phone screenshots
    {
      store: 'play',
      id: 'androidp-1',
      size: { w: 1080, h: 1920 },
      frame: { type: 'canvas', radius: 0.085, island: 'hole' },
      caption: { text: 'One config,\nthree stores', position: 'bottom' },
      output: { format: 'jpeg', quality: 0.94 },
      source: './shots/phone-2.png',
    },
    {
      store: 'play',
      id: 'androidp-2',
      size: { w: 1080, h: 1920 },
      frame: { type: 'canvas', radius: 0.085, island: 'hole' },
      caption: { text: 'Built-in\nstore packs', position: 'bottom' },
      output: { format: 'jpeg', quality: 0.94 },
      source: './shots/phone-5.png',
    },
    // Google Play — Android tablet (bigger, flatter corners)
    {
      store: 'play',
      id: 'androidt-1',
      size: { w: 1600, h: 2560 },
      frame: { type: 'canvas', radius: 0.05, island: 'hole' },
      caption: { text: 'Tablet ready', position: 'bottom' },
      output: { format: 'jpeg', quality: 0.94 },
      source: './shots/tablet-1.png',
    },
    // Google Play — FEATURE GRAPHIC (1024×500 wide banner, no device bezel)
    {
      store: 'play',
      id: 'feature-graphic',
      size: { w: 1024, h: 500 },
      frame: { type: 'none' },
      caption: { text: 'Frame every store', position: 'bottom' },
      output: { format: 'png' },
      source: './shots/feature-1.png',
    },
    // ── Chrome Web Store: 3 browser-framed screenshots
    {
      store: 'chrome',
      id: 'screenshot-1',
      size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'demo.example.com' },
      background: { type: 'gradient', glowStyle: 'corner-vignette', stops: ['#0b1226', '#070b14'], glow: '#1d4ed8' },
      output: { format: 'png' },
      source: './shots/browser-1.png',
    },
    {
      store: 'chrome',
      id: 'screenshot-2',
      size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'demo.example.com/dashboard' },
      background: { type: 'gradient', glowStyle: 'corner-vignette', stops: ['#0b1226', '#070b14'], glow: '#1d4ed8' },
      output: { format: 'png' },
      source: './shots/browser-2.png',
    },
    {
      store: 'chrome',
      id: 'screenshot-3',
      size: { w: 1280, h: 800 },
      frame: { type: 'browser', url: 'demo.example.com/settings' },
      background: { type: 'gradient', glowStyle: 'corner-vignette', stops: ['#0b1226', '#070b14'], glow: '#1d4ed8' },
      output: { format: 'png' },
      source: './shots/browser-3.png',
    },
    // ── Email — a captured email image, lightly framed (no device bezel)
    {
      store: 'email',
      id: 'preview',
      size: { w: 1200, h: 1600 },
      frame: { type: 'none' },
      caption: { text: 'Your email,\nframed', position: 'bottom' },
      source: './shots/email-1.png',
    },
  ],
});
