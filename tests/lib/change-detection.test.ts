import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  categorizeChange,
  isSignificantChange,
  shouldDocumentChanges,
  hashChanges,
  determineSignificance,
  inferChangeType,
  generateDescriptiveTitle,
  type FileChange,
} from '../../.tai/hooks/lib/change-detection';

describe('change-detection', () => {
  function makeChange(path: string, tool: 'Write' | 'Edit' = 'Edit'): FileChange {
    return {
      tool,
      path,
      category: categorizeChange(path),
      isStructural: false,
    };
  }

  describe('categorizeChange', () => {
    it('categorizes skill files', () => {
      expect(categorizeChange('skills/core/dev.md')).toBe('skill');
    });

    it('categorizes hook files', () => {
      expect(categorizeChange('hooks/LoadContext.hook.ts')).toBe('hook');
    });

    it('categorizes config files', () => {
      expect(categorizeChange('config/team.yaml')).toBe('config');
    });

    it('categorizes markdown as documentation', () => {
      expect(categorizeChange('CORE.md')).toBe('documentation');
    });

    it('excludes memory/work/ paths', () => {
      expect(categorizeChange('memory/work/some-task/PRD.md')).toBeNull();
    });

    it('excludes memory/learnings/ paths', () => {
      expect(categorizeChange('memory/learnings/ALGORITHM/file.md')).toBeNull();
    });

    it('excludes memory/state/ paths', () => {
      expect(categorizeChange('memory/state/current.md')).toBeNull();
    });
  });

  describe('isSignificantChange', () => {
    it('returns false for empty change list', () => {
      expect(isSignificantChange([])).toBe(false);
    });

    it('returns true for structural changes', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'CORE.md', category: 'documentation', isStructural: true,
      }];
      expect(isSignificantChange(changes)).toBe(true);
    });

    it('returns true for hook changes', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'hooks/SecurityValidator.hook.ts', category: 'hook', isStructural: false,
      }];
      expect(isSignificantChange(changes)).toBe(true);
    });

    it('returns false for changes with null category', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'memory/state/foo.json', category: null, isStructural: false,
      }];
      expect(isSignificantChange(changes)).toBe(false);
    });
  });

  describe('shouldDocumentChanges', () => {
    it('returns false for empty list', () => {
      expect(shouldDocumentChanges([])).toBe(false);
    });

    it('returns true for new skill files', () => {
      const changes: FileChange[] = [{
        tool: 'Write', path: 'skills/new-skill.md', category: 'skill', isStructural: false,
      }];
      expect(shouldDocumentChanges(changes)).toBe(true);
    });
  });

  describe('hashChanges', () => {
    it('returns consistent hash for same changes', () => {
      const changes: FileChange[] = [
        { tool: 'Edit', path: 'a.ts', category: 'hook', isStructural: false },
        { tool: 'Write', path: 'b.ts', category: 'skill', isStructural: false },
      ];
      const hash1 = hashChanges(changes);
      const hash2 = hashChanges(changes);
      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different changes', () => {
      const a: FileChange[] = [{ tool: 'Edit', path: 'a.ts', category: null, isStructural: false }];
      const b: FileChange[] = [{ tool: 'Edit', path: 'b.ts', category: null, isStructural: false }];
      expect(hashChanges(a)).not.toBe(hashChanges(b));
    });
  });

  describe('determineSignificance', () => {
    it('returns critical for 5+ structural changes', () => {
      const changes: FileChange[] = Array.from({ length: 5 }, (_, i) => ({
        tool: 'Edit' as const, path: `hooks/h${i}.ts`, category: 'hook' as const, isStructural: true,
      }));
      expect(determineSignificance(changes)).toBe('critical');
    });

    it('returns minor for single non-structural change', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'docs/readme.md', category: 'documentation', isStructural: false,
      }];
      expect(determineSignificance(changes)).toBe('minor');
    });
  });

  describe('inferChangeType', () => {
    it('returns hook_update for hook-only changes', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'hooks/foo.ts', category: 'hook', isStructural: false,
      }];
      expect(inferChangeType(changes)).toBe('hook_update');
    });

    it('returns multi_area for 3+ categories', () => {
      const changes: FileChange[] = [
        { tool: 'Edit', path: 'hooks/a.ts', category: 'hook', isStructural: false },
        { tool: 'Edit', path: 'skills/b.md', category: 'skill', isStructural: false },
        { tool: 'Edit', path: 'config/c.yaml', category: 'config', isStructural: false },
      ];
      expect(inferChangeType(changes)).toBe('multi_area');
    });
  });

  describe('generateDescriptiveTitle', () => {
    it('generates hook-specific title', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'hooks/SecurityValidator.hook.ts', category: 'hook', isStructural: false,
      }];
      expect(generateDescriptiveTitle(changes)).toContain('SecurityValidator');
    });

    it('generates config title', () => {
      const changes: FileChange[] = [{
        tool: 'Edit', path: 'config/team.yaml', category: 'config', isStructural: false,
      }];
      expect(generateDescriptiveTitle(changes)).toContain('Configuration');
    });

    it('generates multi-area title for mixed changes', () => {
      const changes: FileChange[] = [
        { tool: 'Edit', path: 'hooks/a.ts', category: 'hook', isStructural: false },
        { tool: 'Edit', path: 'skills/b.md', category: 'skill', isStructural: false },
      ];
      // hooks take priority in title generation
      expect(generateDescriptiveTitle(changes)).toContain('Hook');
    });
  });
});
