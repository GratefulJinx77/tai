import { describe, it, expect } from 'vitest';
import { getLearningCategory, isLearningCapture } from '../../.tai/hooks/lib/learning-utils';

describe('learning-utils', () => {
  describe('getLearningCategory', () => {
    it('classifies algorithm-related content as ALGORITHM', () => {
      expect(getLearningCategory('over-engineered the solution')).toBe('ALGORITHM');
      expect(getLearningCategory('wrong approach was taken')).toBe('ALGORITHM');
      expect(getLearningCategory('should have asked first')).toBe('ALGORITHM');
      expect(getLearningCategory('too complex for the task')).toBe('ALGORITHM');
    });

    it('classifies system-related content as SYSTEM', () => {
      expect(getLearningCategory('hook crashed on startup')).toBe('SYSTEM');
      expect(getLearningCategory('typescript compilation error')).toBe('SYSTEM');
      expect(getLearningCategory('npm module not found')).toBe('SYSTEM');
      expect(getLearningCategory('config file was broken')).toBe('SYSTEM');
    });

    it('defaults to ALGORITHM for unclassified content', () => {
      expect(getLearningCategory('some random text')).toBe('ALGORITHM');
    });

    it('considers comment text when categorizing', () => {
      expect(getLearningCategory('did work', 'hook issue')).toBe('SYSTEM');
      expect(getLearningCategory('did work', 'wrong approach')).toBe('ALGORITHM');
    });
  });

  describe('isLearningCapture', () => {
    it('returns true when 2+ learning indicators match', () => {
      expect(isLearningCapture('the error was fixed after debugging', 'bug fixed', '')).toBe(true);
      expect(isLearningCapture('', 'resolved the issue', 'lesson learned')).toBe(true);
    });

    it('returns false when fewer than 2 indicators match', () => {
      expect(isLearningCapture('everything is fine', '', '')).toBe(false);
      expect(isLearningCapture('just a regular task', '', '')).toBe(false);
    });

    it('checks summary and analysis text', () => {
      expect(isLearningCapture('plain text', 'discovered a bug', 'the root cause was found')).toBe(true);
    });
  });
});
