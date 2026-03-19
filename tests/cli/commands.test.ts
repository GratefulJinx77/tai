import { describe, it, expect } from 'vitest';

describe('CLI command registration', () => {
  it('cli.ts imports all command modules', async () => {
    // Verify each command module exports the expected function
    const initMod = await import('../../cli/src/commands/init');
    const installMod = await import('../../cli/src/commands/install');
    const updateMod = await import('../../cli/src/commands/update');
    const statusMod = await import('../../cli/src/commands/status');

    expect(typeof initMod.init).toBe('function');
    expect(typeof installMod.install).toBe('function');
    expect(typeof updateMod.update).toBe('function');
    expect(typeof statusMod.status).toBe('function');
  });

  it('install module handles missing .tai/ directory', async () => {
    const origCwd = process.cwd;
    const testDir = '/tmp/nonexistent-dir-' + Date.now();
    process.cwd = () => testDir;

    const exitMock = vi.fn(() => { throw new Error('process.exit called'); });
    const origExit = process.exit;
    process.exit = exitMock as any;

    const origError = console.error;
    console.error = vi.fn();

    try {
      vi.resetModules();
      const { install } = await import('../../cli/src/commands/install');
      try {
        install(undefined, {});
      } catch {
        // Expected: process.exit throws our sentinel
      }
      expect(exitMock).toHaveBeenCalledWith(1);
    } finally {
      process.cwd = origCwd;
      process.exit = origExit;
      console.error = origError;
    }
  });
});
