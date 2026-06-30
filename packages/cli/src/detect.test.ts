import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectConfig } from './detect.js';

describe('detectConfig', () => {
  it('returns null when no config present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sf-'));
    expect(detectConfig(dir)).toBeNull();
  });

  it('finds the first matching candidate in priority order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sf-'));
    writeFileSync(join(dir, 'shotframe.config.json'), '{}');
    writeFileSync(join(dir, 'shotframe.config.ts'), 'export default {}');
    // .ts has higher priority than .json
    expect(detectConfig(dir)).toBe(join(dir, 'shotframe.config.ts'));
  });

  it('honours a custom candidate list', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sf-'));
    writeFileSync(join(dir, 'shotframe.config.json'), '{}');
    expect(detectConfig(dir, ['shotframe.config.json'])).toBe(join(dir, 'shotframe.config.json'));
  });
});
