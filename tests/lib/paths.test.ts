import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join, dirname } from 'path';

// We need to reset the cached value between tests
// The module caches getTaiDir, so we re-import each test via dynamic import

describe('paths module', () => {
  const PROJECT_ROOT = resolve(__dirname, '../..');
  const TAI_DIR = join(PROJECT_ROOT, '.tai');

  describe('expandPath', () => {
    it('expands ~ to home directory', async () => {
      const { expandPath } = await import('../../.tai/hooks/lib/paths');
      const home = require('os').homedir();
      expect(expandPath('~/foo/bar')).toBe(`${home}/foo/bar`);
    });

    it('expands $HOME to home directory', async () => {
      const { expandPath } = await import('../../.tai/hooks/lib/paths');
      const home = require('os').homedir();
      expect(expandPath('$HOME/foo')).toBe(`${home}/foo`);
    });

    it('expands ${HOME} to home directory', async () => {
      const { expandPath } = await import('../../.tai/hooks/lib/paths');
      const home = require('os').homedir();
      expect(expandPath('${HOME}/foo')).toBe(`${home}/foo`);
    });

    it('leaves absolute paths unchanged', async () => {
      const { expandPath } = await import('../../.tai/hooks/lib/paths');
      expect(expandPath('/usr/local/bin')).toBe('/usr/local/bin');
    });

    it('does not expand ~ in the middle of a path', async () => {
      const { expandPath } = await import('../../.tai/hooks/lib/paths');
      expect(expandPath('/foo/~/bar')).toBe('/foo/~/bar');
    });
  });

  describe('getTaiDir', () => {
    it('finds .tai/ from project root cwd', async () => {
      // Reset module cache to avoid stale cached value
      vi.resetModules();
      const origCwd = process.cwd;
      process.cwd = () => PROJECT_ROOT;
      delete process.env.TAI_DIR;

      const { getTaiDir } = await import('../../.tai/hooks/lib/paths');
      const result = getTaiDir();
      expect(result).toBe(TAI_DIR);

      process.cwd = origCwd;
    });

    it('uses TAI_DIR env var when set', async () => {
      vi.resetModules();
      process.env.TAI_DIR = '/custom/tai/dir';

      const { getTaiDir } = await import('../../.tai/hooks/lib/paths');
      const result = getTaiDir();
      expect(result).toBe('/custom/tai/dir');

      delete process.env.TAI_DIR;
    });
  });

  describe('taiPath', () => {
    it('joins segments relative to TAI_DIR', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { taiPath } = await import('../../.tai/hooks/lib/paths');
      expect(taiPath('hooks', 'lib')).toBe(join(TAI_DIR, 'hooks', 'lib'));
      expect(taiPath('config', 'team.yaml')).toBe(join(TAI_DIR, 'config', 'team.yaml'));

      delete process.env.TAI_DIR;
    });
  });

  describe('getProjectRoot', () => {
    it('returns parent of .tai/ directory', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { getProjectRoot } = await import('../../.tai/hooks/lib/paths');
      expect(getProjectRoot()).toBe(PROJECT_ROOT);

      delete process.env.TAI_DIR;
    });
  });

  describe('helper path functions', () => {
    it('getHooksDir returns hooks path', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { getHooksDir } = await import('../../.tai/hooks/lib/paths');
      expect(getHooksDir()).toBe(join(TAI_DIR, 'hooks'));

      delete process.env.TAI_DIR;
    });

    it('getSkillsDir returns skills path', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { getSkillsDir } = await import('../../.tai/hooks/lib/paths');
      expect(getSkillsDir()).toBe(join(TAI_DIR, 'skills'));

      delete process.env.TAI_DIR;
    });

    it('getMemoryDir returns memory path', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { getMemoryDir } = await import('../../.tai/hooks/lib/paths');
      expect(getMemoryDir()).toBe(join(TAI_DIR, 'memory'));

      delete process.env.TAI_DIR;
    });

    it('getConfigDir returns config path', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { getConfigDir } = await import('../../.tai/hooks/lib/paths');
      expect(getConfigDir()).toBe(join(TAI_DIR, 'config'));

      delete process.env.TAI_DIR;
    });

    it('getTelemetryDir returns telemetry path', async () => {
      vi.resetModules();
      process.env.TAI_DIR = TAI_DIR;

      const { getTelemetryDir } = await import('../../.tai/hooks/lib/paths');
      expect(getTelemetryDir()).toBe(join(TAI_DIR, 'telemetry'));

      delete process.env.TAI_DIR;
    });
  });
});
