import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'path';

describe('CLI status command', () => {
  it('status module exports a status function', async () => {
    const mod = await import('../../cli/src/commands/status');
    expect(typeof mod.status).toBe('function');
  });

  it('status reads from .tai/ and outputs information', async () => {
    const origCwd = process.cwd;
    const PROJECT_ROOT = resolve(__dirname, '../..');
    process.cwd = () => PROJECT_ROOT;

    const origLog = console.log;
    const logs: string[] = [];
    console.log = ((...args: any[]) => logs.push(args.join(' '))) as any;

    const origError = console.error;
    console.error = vi.fn();

    const origExit = process.exit;
    process.exit = vi.fn() as any;

    try {
      vi.resetModules();
      const { status } = await import('../../cli/src/commands/status');
      status();

      const output = logs.join('\n');
      // The command should output version and hook/memory info
      expect(output).toContain('TAI v');
      expect(output).toContain('Hooks:');
      expect(output).toContain('Memory:');
    } finally {
      process.cwd = origCwd;
      console.log = origLog;
      console.error = origError;
      process.exit = origExit;
    }
  });
});
