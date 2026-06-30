import { defineConfig } from 'tsup';

// The CLI is a NODE-target tool: it spins up a node:http static host and drives
// Playwright. commander/playwright/@shotframe/* stay external (real deps).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  banner: { js: '#!/usr/bin/env node' },
});
