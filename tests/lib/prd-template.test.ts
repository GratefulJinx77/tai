import { describe, it, expect } from 'vitest';
import {
  curateTitle,
  generatePRDFilename,
  generatePRDId,
  generatePRDTemplate,
} from '../../.tai/hooks/lib/prd-template';

describe('prd-template', () => {
  describe('curateTitle', () => {
    it('strips filler words from the start', () => {
      expect(curateTitle('okay fix the login')).toBe('Fix the login');
      expect(curateTitle("let's build a new feature")).toBe('Build a new feature');
      expect(curateTitle('can you update the tests')).toBe('Update the tests');
      expect(curateTitle('please deploy to staging')).toBe('Deploy to staging');
    });

    it('capitalizes first letter', () => {
      expect(curateTitle('fix the bug')).toBe('Fix the bug');
    });

    it('truncates to 80 characters', () => {
      const longTitle = 'a'.repeat(100);
      const result = curateTitle(longTitle);
      expect(result.length).toBeLessThanOrEqual(80);
    });

    it('returns "Untitled Task" for empty input', () => {
      expect(curateTitle('')).toBe('Untitled Task');
    });

    it('collapses whitespace', () => {
      expect(curateTitle('fix   the   bug')).toBe('Fix the bug');
    });
  });

  describe('generatePRDFilename', () => {
    it('includes date and slug', () => {
      const result = generatePRDFilename('my-task');
      expect(result).toMatch(/^PRD-\d{8}-my-task\.md$/);
    });
  });

  describe('generatePRDId', () => {
    it('generates ID with date and slug', () => {
      const result = generatePRDId('my-task');
      expect(result).toMatch(/^PRD-\d{8}-my-task$/);
    });
  });

  describe('generatePRDTemplate', () => {
    it('generates valid PRD with frontmatter', () => {
      const result = generatePRDTemplate({
        title: 'Test Task',
        slug: 'test-task',
        effortLevel: 'Standard',
      });

      expect(result).toContain('---');
      expect(result).toContain('prd: true');
      expect(result).toContain('# Test Task');
      expect(result).toContain('## IDEAL STATE CRITERIA');
      expect(result).toContain('## APPETITE');
    });

    it('uses curated title from prompt', () => {
      const result = generatePRDTemplate({
        title: 'Raw Title',
        slug: 'raw-title',
        prompt: 'okay fix the login page',
      });

      expect(result).toContain('Fix the login page');
    });

    it('applies correct effort level budget', () => {
      const trivial = generatePRDTemplate({ title: 'T', slug: 't', effortLevel: 'Trivial' });
      expect(trivial).toContain('<10s');

      const deep = generatePRDTemplate({ title: 'T', slug: 't', effortLevel: 'Deep' });
      expect(deep).toContain('<32min');
    });

    it('defaults to Standard effort', () => {
      const result = generatePRDTemplate({ title: 'T', slug: 't' });
      expect(result).toContain('effort_level: Standard');
      expect(result).toContain('8-16');
    });
  });
});
