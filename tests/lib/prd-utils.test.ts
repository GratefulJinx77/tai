import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  writeFrontmatterField,
  countCriteria,
  parseCriteriaList,
} from '../../.tai/hooks/lib/prd-utils';

describe('prd-utils', () => {
  const SAMPLE_PRD = `---
slug: test-task
task: Fix the login bug
phase: BUILD
progress: 3/5
effort: standard
mode: interactive
started: 2026-03-19
---

# Fix the login bug

## Criteria
- [x] ISC-001: Login form validates email
- [ ] ISC-002: Error message displays correctly
- [x] ISC-003: Session persists on refresh
- [x] ISC-A-001: Does not allow SQL injection
- [ ] ISC-004: Rate limiting works

## Other section
`;

  describe('parseFrontmatter', () => {
    it('parses YAML frontmatter from PRD content', () => {
      const fm = parseFrontmatter(SAMPLE_PRD);
      expect(fm).not.toBeNull();
      expect(fm!.slug).toBe('test-task');
      expect(fm!.task).toBe('Fix the login bug');
      expect(fm!.phase).toBe('BUILD');
      expect(fm!.progress).toBe('3/5');
      expect(fm!.effort).toBe('standard');
    });

    it('returns null for content without frontmatter', () => {
      expect(parseFrontmatter('# No frontmatter here')).toBeNull();
    });

    it('strips quotes from values', () => {
      const content = `---
title: "Hello World"
slug: 'my-slug'
---`;
      const fm = parseFrontmatter(content);
      expect(fm!.title).toBe('Hello World');
      expect(fm!.slug).toBe('my-slug');
    });
  });

  describe('writeFrontmatterField', () => {
    it('updates an existing field in frontmatter', () => {
      const result = writeFrontmatterField(SAMPLE_PRD, 'phase', 'VERIFY');
      const fm = parseFrontmatter(result);
      expect(fm!.phase).toBe('VERIFY');
    });

    it('adds a new field if not present', () => {
      const result = writeFrontmatterField(SAMPLE_PRD, 'newField', 'newValue');
      const fm = parseFrontmatter(result);
      expect(fm!.newField).toBe('newValue');
    });

    it('returns unchanged content if no frontmatter', () => {
      const plain = '# No frontmatter';
      expect(writeFrontmatterField(plain, 'field', 'val')).toBe(plain);
    });
  });

  describe('countCriteria', () => {
    it('counts checked and total criteria', () => {
      const result = countCriteria(SAMPLE_PRD);
      expect(result.total).toBe(5);
      expect(result.checked).toBe(3);
    });

    it('returns zeros for content without criteria', () => {
      const result = countCriteria('# No criteria section');
      expect(result.total).toBe(0);
      expect(result.checked).toBe(0);
    });
  });

  describe('parseCriteriaList', () => {
    it('parses criteria with IDs and statuses', () => {
      const criteria = parseCriteriaList(SAMPLE_PRD);
      expect(criteria.length).toBe(5);

      const first = criteria[0];
      expect(first.id).toBe('ISC-001');
      expect(first.description).toBe('Login form validates email');
      expect(first.type).toBe('criterion');
      expect(first.status).toBe('completed');

      const second = criteria[1];
      expect(second.status).toBe('pending');
    });

    it('identifies anti-criteria by -A- in ID', () => {
      const criteria = parseCriteriaList(SAMPLE_PRD);
      const anti = criteria.find(c => c.id === 'ISC-A-001');
      expect(anti).toBeDefined();
      expect(anti!.type).toBe('anti-criterion');
    });

    it('returns empty array for content without criteria', () => {
      expect(parseCriteriaList('# No criteria')).toEqual([]);
    });
  });
});
