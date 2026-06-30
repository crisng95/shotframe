import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Config file names tried, in order, when `--config` is omitted. */
export const CONFIG_CANDIDATES = [
  'shotframe.config.ts',
  'shotframe.config.js',
  'shotframe.config.mjs',
  'shotframe.config.json',
];

/** Find the first existing config file in `cwd`, or null. Pure + testable. */
export function detectConfig(cwd: string, candidates: string[] = CONFIG_CANDIDATES): string | null {
  for (const name of candidates) {
    const p = resolve(cwd, name);
    if (existsSync(p)) return p;
  }
  return null;
}
