import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from './init.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'sf-init-'));
}

describe('runInit', () => {
  it('scaffolds a .ts config + a valid sample PNG', async () => {
    const dir = tmp();
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const { config, sample } = await runInit({});
      expect(config.endsWith('shotframe.config.ts')).toBe(true);
      expect(existsSync(config)).toBe(true);
      expect(existsSync(sample)).toBe(true);
      // sample is a real PNG (magic bytes)
      const magic = readFileSync(sample).subarray(0, 4).toString('binary');
      expect(magic).toBe('\x89PNG');
      // config references the sample + the three stores
      const text = readFileSync(config, 'utf8');
      expect(text).toContain('./shots/sample.png');
      for (const s of ['appstore', 'play', 'chrome']) expect(text).toContain(s);
    } finally {
      process.chdir(prev);
    }
  });

  it('writes JSON when --json and refuses to overwrite without --force', async () => {
    const dir = tmp();
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const { config } = await runInit({ json: true });
      expect(config.endsWith('shotframe.config.json')).toBe(true);
      // valid JSON with targets
      const parsed = JSON.parse(readFileSync(config, 'utf8')) as { targets: unknown[] };
      expect(Array.isArray(parsed.targets)).toBe(true);
      // second run without force throws
      await expect(runInit({ json: true })).rejects.toThrow(/already exists/);
      // with force it succeeds
      await expect(runInit({ json: true, force: true })).resolves.toBeTruthy();
    } finally {
      process.chdir(prev);
    }
  });
});
