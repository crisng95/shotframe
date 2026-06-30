import { defineConfig } from 'vite';

/**
 * The studio is a static browser app. The CLI `studio` command serves the
 * prebuilt `dist/` over a `node:http` host, so asset URLs must be RELATIVE
 * (`base: './'`) — otherwise `/assets/*` would 404 behind the CLI host.
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    emptyOutDir: true,
    sourcemap: true,
  },
});
