// Loaded by jiti in load.test.ts to exercise the typed `.ts` config path.
import { defineConfig } from '../../src/index';

export default defineConfig({
  brand: {
    name: 'Sample App',
    colors: { primary: '#3aa0ff', accent: '#7c5cff', bg: '#0b1020' },
  },
  background: { type: 'gradient', stops: ['#0b1020', '#161c33'], glow: '#3aa0ff' },
  targets: [
    {
      store: 'appstore',
      id: 'iphone69',
      size: { w: 1290, h: 2796 },
      source: 'shots/home.png',
      caption: { text: 'Solve any quiz' },
    },
  ],
  output: { dir: 'out' },
});
