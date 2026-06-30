import { defineConfig } from 'tsup';

// Core is a browser-target engine: it needs an injected CanvasRenderingContext2D,
// so there is no node build. ESM only, with type declarations.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'browser',
  target: 'es2020',
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
