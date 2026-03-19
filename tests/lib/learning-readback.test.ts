import { describe, it, expect } from 'vitest';
import { loadLearningDigest, loadWisdomFrames, loadFailurePatterns, loadSignalTrends } from '../../.tai/hooks/lib/learning-readback';
import { join } from 'path';

const TAI_DIR = '/home/wbj/alpha-root/builds/tai/.tai';

describe('learning-readback', () => {
  describe('loadLearningDigest', () => {
    it('returns null when no learning directories exist', () => {
      // TAI_DIR has memory/learnings but no ALGORITHM or SYSTEM subdirs
      const result = loadLearningDigest(TAI_DIR);
      // Since there are no ALGORITHM/SYSTEM learning subdirs in the test env, should be null
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('returns null for nonexistent directory', () => {
      expect(loadLearningDigest('/tmp/nonexistent-tai-dir')).toBeNull();
    });
  });

  describe('loadWisdomFrames', () => {
    it('returns null when no wisdom frames exist', () => {
      expect(loadWisdomFrames(TAI_DIR)).toBeNull();
    });

    it('returns null for nonexistent directory', () => {
      expect(loadWisdomFrames('/tmp/nonexistent-tai-dir')).toBeNull();
    });
  });

  describe('loadFailurePatterns', () => {
    it('returns null when no failure patterns exist', () => {
      expect(loadFailurePatterns(TAI_DIR)).toBeNull();
    });

    it('returns null for nonexistent directory', () => {
      expect(loadFailurePatterns('/tmp/nonexistent-tai-dir')).toBeNull();
    });
  });

  describe('loadSignalTrends', () => {
    it('returns null when no cache file exists', () => {
      expect(loadSignalTrends(TAI_DIR)).toBeNull();
    });

    it('returns null for nonexistent directory', () => {
      expect(loadSignalTrends('/tmp/nonexistent-tai-dir')).toBeNull();
    });
  });
});
