/**
 * Bundle the prebuilt @shotframe/studio static UI into the CLI's own dist so the
 * published `@shotframe/cli` package is self-contained (studio stays private and
 * is NOT a runtime dependency). `shotframe studio` serves this copy.
 *
 * Source: ../studio/dist  ->  Dest: ./dist/studio
 * In the monorepo, pnpm builds @shotframe/studio first (it's a devDependency of
 * the CLI, so it's ordered before the CLI build).
 */
import { cp, rm, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const src = join(pkgRoot, '..', 'studio', 'dist');
const dest = join(pkgRoot, 'dist', 'studio');

try {
  await access(src);
} catch {
  console.error(
    `[copy-studio] studio dist not found at ${src}.\n` +
      `Build it first: pnpm --filter @shotframe/studio build`,
  );
  process.exit(1);
}

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
console.log(`[copy-studio] bundled studio UI -> ${dest}`);
