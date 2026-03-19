import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('CLI init command', () => {
  const TEST_DIR = '/tmp/tai-test-init-' + Date.now();

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
  });

  it('init module exports an init function', async () => {
    const mod = await import('../../cli/src/commands/init');
    expect(typeof mod.init).toBe('function');
  });

  it('init creates .tai/ scaffold in target directory', async () => {
    // We test by calling init with cwd set to our test dir
    const origCwd = process.cwd;
    const origExit = process.exit;
    process.cwd = () => TEST_DIR;
    process.exit = vi.fn() as any;

    // Mock console.log to suppress output
    const origLog = console.log;
    const origError = console.error;
    console.log = vi.fn();
    console.error = vi.fn();

    try {
      const { init } = await import('../../cli/src/commands/init');
      init({ force: true });

      const taiDir = join(TEST_DIR, '.tai');
      // Check key directories were created
      expect(existsSync(taiDir)).toBe(true);
      expect(existsSync(join(taiDir, 'config'))).toBe(true);
      expect(existsSync(join(taiDir, 'hooks'))).toBe(true);
      expect(existsSync(join(taiDir, 'memory', 'decisions'))).toBe(true);
      expect(existsSync(join(taiDir, 'CORE.md'))).toBe(true);
      expect(existsSync(join(taiDir, 'VERSION'))).toBe(true);
    } finally {
      process.cwd = origCwd;
      process.exit = origExit;
      console.log = origLog;
      console.error = origError;
    }
  });

  it('init refuses to overwrite existing .tai/ without --force', async () => {
    const origCwd = process.cwd;
    process.cwd = () => TEST_DIR;

    // Create existing .tai/ dir
    mkdirSync(join(TEST_DIR, '.tai'), { recursive: true });

    const exitMock = vi.fn();
    const origExit = process.exit;
    process.exit = exitMock as any;

    const origError = console.error;
    console.error = vi.fn();

    try {
      // Need fresh import to avoid any stale state
      vi.resetModules();
      const { init } = await import('../../cli/src/commands/init');
      init({});

      expect(exitMock).toHaveBeenCalledWith(1);
    } finally {
      process.cwd = origCwd;
      process.exit = origExit;
      console.error = origError;
    }
  });
});
