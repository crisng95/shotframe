/**
 * Build a SELF-CONTAINED, registry-free release of `@shotframe/cli` under
 * `packages/cli/release/`. The workspace packages (`@shotframe/core`,
 * `@shotframe/config`, `@shotframe/fonts`) don't exist on npm, so a plain
 * `npm pack` tarball is uninstallable. Here we:
 *
 *   1. Bundle `src/index.ts` -> `release/dist/index.js` with esbuild, inlining the
 *      TS source of every `@shotframe/*` package and keeping ONLY the public npm
 *      deps (commander / playwright / jiti / zod) + `node:*` external.
 *   2. Ship the runtime assets the bundle SERVES as files (can't be inlined):
 *        - release/dist/assets/core.js      <- packages/core/dist/index.js (browser core)
 *        - release/dist/assets/fonts/*.woff2 <- packages/fonts/fonts/*
 *        - release/dist/studio/             <- packages/studio/dist/ (studio UI)
 *        - release/dist/assets/config-shim.mjs (defineConfig shim for .ts configs)
 *   3. Write a clean `release/package.json` with NO `@shotframe/*` deps.
 *
 * The result: `npm i -g packages/cli/release` (or its `npm pack` tarball) works
 * with no private registry; npm fetches only the four public deps.
 */
import { build } from 'esbuild';
import { cp, rm, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(here, '..');
const repoRoot = join(cliRoot, '..', '..');
const release = join(cliRoot, 'release');
const releaseDist = join(release, 'dist');
const assetsDir = join(releaseDist, 'assets');

const PUBLIC_EXTERNAL = ['commander', 'playwright', 'jiti', 'zod'];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

// ---- 0. read versions from the workspace package.json files ----
const cliPkg = await readJson(join(cliRoot, 'package.json'));
const configPkg = await readJson(join(repoRoot, 'packages', 'config', 'package.json'));

// Public deps come from where they're actually declared. zod is a transitive dep
// (via @shotframe/config) that gets inlined into the bundle, so it must be a real
// runtime dependency of the release package.
const depRange = (name) =>
  cliPkg.dependencies?.[name] ??
  configPkg.dependencies?.[name] ??
  null;

const releaseDeps = {};
for (const name of PUBLIC_EXTERNAL) {
  const range = depRange(name);
  if (!range) throw new Error(`Could not find a version range for public dep "${name}"`);
  releaseDeps[name] = range;
}

// ---- 1. clean + recreate release/ ----
await rm(release, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

// ---- 2. bundle src/index.ts -> release/dist/index.js ----
await build({
  entryPoints: [join(cliRoot, 'src', 'index.ts')],
  outfile: join(releaseDist, 'index.js'),
  platform: 'node',
  format: 'esm',
  bundle: true,
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  // Keep public deps + all node builtins external; everything else (the
  // @shotframe/* TS source) is inlined. esbuild preserves import.meta.url /
  // import.meta.resolve under the ESM format.
  external: [...PUBLIC_EXTERNAL, 'node:*'],
  logLevel: 'info',
});

// ---- 3. ship runtime assets ----
// 3a. browser core artifact -> assets/core.js
const coreArtifact = join(repoRoot, 'packages', 'core', 'dist', 'index.js');
if (!(await exists(coreArtifact))) {
  throw new Error(`core artifact missing: ${coreArtifact}. Run \`pnpm -r build\` first.`);
}
await cp(coreArtifact, join(assetsDir, 'core.js'));

// 3b. bundled woff2 faces -> assets/fonts/
const fontsSrc = join(repoRoot, 'packages', 'fonts', 'fonts');
if (!(await exists(fontsSrc))) {
  throw new Error(`fonts dir missing: ${fontsSrc}`);
}
await cp(fontsSrc, join(assetsDir, 'fonts'), { recursive: true });

// 3c. studio UI -> dist/studio/  (beside index.js, so studio.ts finds ./studio)
const studioSrc = join(repoRoot, 'packages', 'studio', 'dist');
if (!(await exists(join(studioSrc, 'index.html')))) {
  throw new Error(`studio dist missing: ${studioSrc}. Run \`pnpm -r build\` first.`);
}
await cp(studioSrc, join(releaseDist, 'studio'), { recursive: true });

// 3d. defineConfig shim so user `.ts` configs can import { defineConfig } from
// '@shotframe/config' in a project that never installed the workspace packages.
await writeFile(
  join(assetsDir, 'config-shim.mjs'),
  '// Minimal @shotframe/config shim for the self-contained CLI tarball.\n' +
    '// In the bundled release the real package is not on disk; user .ts configs\n' +
    '// only need defineConfig (an identity pass-through) to load via jiti.\n' +
    'export const defineConfig = (c) => c;\n' +
    'export default defineConfig;\n',
);

// ---- 4. clean release package.json (NO @shotframe/* deps) ----
const releasePkg = {
  name: cliPkg.name,
  version: cliPkg.version,
  description: cliPkg.description,
  keywords: cliPkg.keywords,
  license: cliPkg.license ?? 'MIT',
  author: cliPkg.author,
  repository: cliPkg.repository,
  homepage: cliPkg.homepage,
  bugs: cliPkg.bugs,
  type: 'module',
  bin: { shotframe: './dist/index.js' },
  files: ['dist'],
  dependencies: releaseDeps,
  engines: cliPkg.engines,
  publishConfig: cliPkg.publishConfig,
};
await writeFile(join(release, 'package.json'), JSON.stringify(releasePkg, null, 2) + '\n');

// ---- 5. README + LICENSE alongside the package ----
for (const f of ['README.md', 'LICENSE']) {
  const src = join(repoRoot, f);
  if (await exists(src)) await cp(src, join(release, f));
}

console.log(`[build-release] wrote ${release}`);
console.log(`[build-release] deps: ${JSON.stringify(releaseDeps)}`);
