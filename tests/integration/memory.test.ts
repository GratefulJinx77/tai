import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const TAI_DIR = resolve(__dirname, '../../.tai');
const MEMORY_DIR = join(TAI_DIR, 'memory');

describe('memory system integration', () => {
  describe('directory structure', () => {
    it('memory/ directory exists', () => {
      expect(existsSync(MEMORY_DIR)).toBe(true);
    });

    const stores = ['decisions', 'learnings', 'state', 'signals', 'failures'];
    it.each(stores)('memory/%s store exists', (store) => {
      expect(existsSync(join(MEMORY_DIR, store))).toBe(true);
    });

    it('memory/README.md exists', () => {
      expect(existsSync(join(MEMORY_DIR, 'README.md'))).toBe(true);
    });
  });

  describe('decisions', () => {
    it('INDEX.md exists and is valid markdown', () => {
      const indexPath = join(MEMORY_DIR, 'decisions', 'INDEX.md');
      expect(existsSync(indexPath)).toBe(true);
      const content = readFileSync(indexPath, 'utf-8');
      expect(content).toContain('# ');
      expect(content.length).toBeGreaterThan(10);
    });

    it('TEMPLATE.md exists and has required YAML frontmatter fields', () => {
      const templatePath = join(MEMORY_DIR, 'decisions', 'TEMPLATE.md');
      expect(existsSync(templatePath)).toBe(true);
      const content = readFileSync(templatePath, 'utf-8');

      // Must have frontmatter
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('---');

      // Required fields
      expect(content).toContain('title:');
      expect(content).toContain('date:');
      expect(content).toContain('status:');
    });
  });

  describe('learnings', () => {
    it('summary.md exists', () => {
      const summaryPath = join(MEMORY_DIR, 'learnings', 'summary.md');
      expect(existsSync(summaryPath)).toBe(true);
    });
  });

  describe('state', () => {
    it('current.md exists', () => {
      const currentPath = join(MEMORY_DIR, 'state', 'current.md');
      expect(existsSync(currentPath)).toBe(true);
    });
  });

  describe('.gitignore', () => {
    it('exists in memory directory', () => {
      const gitignorePath = join(MEMORY_DIR, '.gitignore');
      expect(existsSync(gitignorePath)).toBe(true);
    });

    it('excludes ephemeral files', () => {
      const content = readFileSync(join(MEMORY_DIR, '.gitignore'), 'utf-8');
      expect(content).toContain('pre-compact');
      expect(content).toContain('session-');
    });
  });
});
