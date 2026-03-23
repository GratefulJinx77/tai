import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock readline before importing init
vi.mock('node:readline', () => ({
  createInterface: () => ({
    question: (_prompt: string, cb: (answer: string) => void) => cb(''),
    close: () => {},
  }),
}));

describe('CLI init command', () => {
  const TEST_DIR = '/tmp/tai-test-init-' + Date.now();

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
    vi.restoreAllMocks();
  });

  it('init module exports an init function', async () => {
    const mod = await import('../../cli/src/commands/init');
    expect(typeof mod.init).toBe('function');
  });

  it('init creates .tai/ scaffold in target directory', async () => {
    const origCwd = process.cwd;
    const origExit = process.exit;
    process.cwd = () => TEST_DIR;
    process.exit = vi.fn() as any;

    const origLog = console.log;
    const origError = console.error;
    console.log = vi.fn();
    console.error = vi.fn();

    try {
      vi.resetModules();
      // Re-mock readline after resetModules
      vi.doMock('node:readline', () => ({
        createInterface: () => ({
          question: (_prompt: string, cb: (answer: string) => void) => cb(''),
          close: () => {},
        }),
      }));

      const { init } = await import('../../cli/src/commands/init');
      await init({ force: true });

      const taiDir = join(TEST_DIR, '.tai');
      expect(existsSync(taiDir)).toBe(true);
      expect(existsSync(join(taiDir, 'config'))).toBe(true);
      expect(existsSync(join(taiDir, 'memory', 'decisions'))).toBe(true);
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

    mkdirSync(join(TEST_DIR, '.tai'), { recursive: true });

    const exitMock = vi.fn();
    const origExit = process.exit;
    process.exit = exitMock as any;

    const origError = console.error;
    console.error = vi.fn();

    try {
      vi.resetModules();
      const { init } = await import('../../cli/src/commands/init');
      await init({});

      expect(exitMock).toHaveBeenCalledWith(1);
    } finally {
      process.cwd = origCwd;
      process.exit = origExit;
      console.error = origError;
    }
  });
});
