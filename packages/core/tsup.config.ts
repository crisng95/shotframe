import { defineConfig } from 'tsup';

// Core is a pure, isomorphic HTML/CSS string builder (no canvas, no DOM, no
// Node APIs) — it runs unchanged in Node (CLI) and the browser (studio).
// ESM only, with type declarations.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
