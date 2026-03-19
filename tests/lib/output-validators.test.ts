import { describe, it, expect } from 'vitest';
import {
  isValidVoiceCompletion,
  getVoiceFallback,
  isValidWorkingTitle,
  isValidCompletionTitle,
  isValidQuestionTitle,
  trimToValidTitle,
  getWorkingFallback,
  getCompletionFallback,
  getQuestionFallback,
  gerundToPastTense,
} from '../../.tai/hooks/lib/output-validators';

describe('output-validators', () => {
  describe('isValidVoiceCompletion', () => {
    it('rejects short text (< 10 chars)', () => {
      expect(isValidVoiceCompletion('hi')).toBe(false);
      expect(isValidVoiceCompletion('')).toBe(false);
    });

    it('rejects garbage patterns', () => {
      expect(isValidVoiceCompletion('I appreciate your help with this')).toBe(false);
      expect(isValidVoiceCompletion('Thank you for reaching out')).toBe(false);
      expect(isValidVoiceCompletion('Feel free to ask anytime')).toBe(false);
    });

    it('rejects conversational starters', () => {
      expect(isValidVoiceCompletion("I'm going to help you with that")).toBe(false);
      expect(isValidVoiceCompletion("Sure, I can do that for you")).toBe(false);
    });

    it('accepts valid completion text', () => {
      expect(isValidVoiceCompletion('Fixed the authentication bug in login handler')).toBe(true);
      expect(isValidVoiceCompletion('Deployed the new version to production')).toBe(true);
    });
  });

  describe('getVoiceFallback', () => {
    it('returns empty string', () => {
      expect(getVoiceFallback()).toBe('');
    });
  });

  describe('isValidWorkingTitle', () => {
    it('accepts gerund-starting titles with period', () => {
      expect(isValidWorkingTitle('Fixing auth bug.')).toBe(true);
      expect(isValidWorkingTitle('Building login page.')).toBe(true);
    });

    it('rejects non-gerund starting titles', () => {
      expect(isValidWorkingTitle('Fixed auth bug.')).toBe(false);
    });

    it('rejects titles without period', () => {
      expect(isValidWorkingTitle('Fixing auth bug')).toBe(false);
    });

    it('rejects titles with too many words', () => {
      expect(isValidWorkingTitle('Fixing the big auth bug today.')).toBe(false);
    });

    it('rejects generic task titles', () => {
      expect(isValidWorkingTitle('Processing the task.')).toBe(false);
    });
  });

  describe('isValidCompletionTitle', () => {
    it('accepts past-tense titles', () => {
      expect(isValidCompletionTitle('Fixed auth bug.')).toBe(true);
      expect(isValidCompletionTitle('Built login page.')).toBe(true);
    });

    it('rejects gerund-starting titles', () => {
      expect(isValidCompletionTitle('Fixing auth bug.')).toBe(false);
    });

    it('rejects titles without period', () => {
      expect(isValidCompletionTitle('Fixed auth bug')).toBe(false);
    });
  });

  describe('isValidQuestionTitle', () => {
    it('accepts short noun phrases without period', () => {
      expect(isValidQuestionTitle('Auth method')).toBe(true);
      expect(isValidQuestionTitle('Database choice')).toBe(true);
    });

    it('rejects titles with period', () => {
      expect(isValidQuestionTitle('Auth method.')).toBe(false);
    });

    it('rejects empty titles', () => {
      expect(isValidQuestionTitle('')).toBe(false);
    });

    it('rejects titles over 30 chars', () => {
      expect(isValidQuestionTitle('This is a very long question title that exceeds')).toBe(false);
    });

    it('rejects titles with HTML tags', () => {
      expect(isValidQuestionTitle('Auth <script>')).toBe(false);
    });
  });

  describe('trimToValidTitle', () => {
    it('trims words to form a valid working title', () => {
      const words = ['Fixing', 'the', 'auth', 'bug', 'in', 'production'];
      const result = trimToValidTitle(words, isValidWorkingTitle);
      expect(result).not.toBeNull();
      expect(result!.endsWith('.')).toBe(true);
    });

    it('returns null when no valid title can be formed', () => {
      const words = ['the'];
      expect(trimToValidTitle(words, isValidWorkingTitle)).toBeNull();
    });
  });

  describe('fallbacks', () => {
    it('getWorkingFallback returns sensible default', () => {
      expect(getWorkingFallback()).toBe('Analyzing input.');
    });

    it('getCompletionFallback returns sensible default', () => {
      expect(getCompletionFallback()).toBe('Task complete.');
    });

    it('getQuestionFallback returns sensible default', () => {
      expect(getQuestionFallback()).toBe('Awaiting input');
    });
  });

  describe('gerundToPastTense', () => {
    it('converts irregular gerunds', () => {
      expect(gerundToPastTense('building')).toBe('Built');
      expect(gerundToPastTense('writing')).toBe('Wrote');
      expect(gerundToPastTense('running')).toBe('Ran');
      expect(gerundToPastTense('making')).toBe('Made');
    });

    it('converts regular gerunds by removing -ing and adding -ed', () => {
      expect(gerundToPastTense('fixing')).toBe('Fixed');
      expect(gerundToPastTense('deploying')).toBe('Deployed');
    });

    it('returns unchanged text if not a gerund', () => {
      expect(gerundToPastTense('done')).toBe('done');
      expect(gerundToPastTense('ok')).toBe('ok');
    });
  });
});
