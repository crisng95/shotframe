import { defineConfig } from 'tsup';

// The config package is a NODE-target tool: loadConfig uses jiti + node:fs to read
// `.ts`/`.json` config files off disk. ESM only, with type declarations. zod, jiti
// and @shotframe/core stay external (they are real dependencies, not bundled).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
