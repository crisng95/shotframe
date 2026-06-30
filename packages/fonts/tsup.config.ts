import { defineConfig } from 'tsup';

// Pure data/manifest package: ESM only, with type declarations.
// The woff2 files and LICENSES are shipped as-is via package.json "files";
// they are not bundled by tsup.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2020',
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
