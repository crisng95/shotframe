import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSkill, SKILL_MD } from './skill.js';

describe('runSkill', () => {
  it('writes .claude/skills/shotframe/SKILL.md with valid frontmatter', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sf-skill-'));
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const { skill } = await runSkill({});
      expect(skill.endsWith(join('.claude', 'skills', 'shotframe', 'SKILL.md'))).toBe(true);
      expect(existsSync(skill)).toBe(true);
      const text = readFileSync(skill, 'utf8');
      expect(text.startsWith('---\n')).toBe(true);
      expect(text).toContain('name: shotframe');
      expect(text).toContain('description:');
      expect(text).toContain('api.ui'); // the kit reference is present
      // refuses to overwrite without force
      await expect(runSkill({})).rejects.toThrow(/already exists/);
      await expect(runSkill({ force: true })).resolves.toBeTruthy();
    } finally {
      process.chdir(prev);
    }
  });

  it('SKILL_MD documents the procedure + is self-contained', () => {
    expect(SKILL_MD).toContain('PresetDrawFn');
    expect(SKILL_MD).toContain('self-contained');
    expect(SKILL_MD).toContain('statusBar');
  });
});
