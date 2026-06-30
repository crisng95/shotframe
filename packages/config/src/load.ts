/**
 * `loadConfig` — read a `shotframe.config.{ts,js,json}` file off disk, validate it
 * against the zod schema, and return a fully-resolved config (targets expanded
 * from store packs). `.ts`/`.js` are loaded via jiti (pure JS, no native binary);
 * `.json` is parsed directly. Validation failures throw a structured `ConfigError`.
 */
import { readFile } from 'node:fs/promises';
import { extname, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import type {
  BackgroundConfig,
  BrandConfig,
  PresetDef,
  ResolvedTarget,
} from '@shotframe/core';
import { ConfigError, type ConfigIssue } from './errors.js';
import { resolveTargets } from './resolve.js';
import { studioConfigInputSchema } from './schema.js';

/** A validated config whose targets are fully resolved (size/frame guaranteed). */
export interface ResolvedStudioConfig {
  brand: BrandConfig;
  background: BackgroundConfig;
  targets: ResolvedTarget[];
  presets?: PresetDef[];
  output?: { dir: string; format?: 'png' | 'jpeg'; quality?: number };
}

const JS_LIKE = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);

async function readModule(absPath: string): Promise<unknown> {
  const jiti = createJiti(pathToFileURL(absPath).href);
  const mod = (await jiti.import(absPath)) as Record<string, unknown>;
  return mod && 'default' in mod ? mod.default : mod;
}

/** Validate an already-parsed object and resolve its targets. */
export function parseConfig(raw: unknown): ResolvedStudioConfig {
  const parsed = studioConfigInputSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: ConfigIssue[] = parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new ConfigError(
      `Invalid shotframe config (${issues.length} issue${issues.length === 1 ? '' : 's'})`,
      issues,
    );
  }
  const targets = resolveTargets(parsed.data);
  return { ...parsed.data, targets };
}

/** Load + validate + resolve a config file by path. */
export async function loadConfig(path: string): Promise<ResolvedStudioConfig> {
  const absPath = resolvePath(path);
  const ext = extname(absPath).toLowerCase();

  let raw: unknown;
  if (ext === '.json') {
    let text: string;
    try {
      text = await readFile(absPath, 'utf8');
    } catch (e) {
      throw new ConfigError(`Cannot read config file: ${absPath}`, [
        { path: '', message: (e as Error).message },
      ]);
    }
    try {
      raw = JSON.parse(text);
    } catch (e) {
      throw new ConfigError(`Invalid JSON in config file: ${absPath}`, [
        { path: '', message: (e as Error).message },
      ]);
    }
  } else if (JS_LIKE.has(ext)) {
    try {
      raw = await readModule(absPath);
    } catch (e) {
      throw new ConfigError(`Failed to load config module: ${absPath}`, [
        { path: '', message: (e as Error).message },
      ]);
    }
  } else {
    throw new ConfigError(
      `Unsupported config extension "${ext || '(none)'}" for ${absPath} (expected .ts, .js or .json)`,
    );
  }

  return parseConfig(raw);
}
