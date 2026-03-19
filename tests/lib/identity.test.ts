import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve } from 'path';

describe('identity module', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TAI_DIR = resolve(__dirname, '../../.tai');
  });

  afterEach(() => {
    delete process.env.TAI_DIR;
  });

  it('getTeamConfig loads team.yaml', async () => {
    const { getTeamConfig, clearCache } = await import('../../.tai/hooks/lib/identity');
    clearCache();
    const config = getTeamConfig();
    expect(config).toBeDefined();
    expect(typeof config.name).toBe('string');
    expect(typeof config.timezone).toBe('string');
    expect(Array.isArray(config.members)).toBe(true);
  });

  it('getTeamName returns a string', async () => {
    const { getTeamName, clearCache } = await import('../../.tai/hooks/lib/identity');
    clearCache();
    expect(typeof getTeamName()).toBe('string');
  });

  it('getTeamTimezone returns a string', async () => {
    const { getTeamTimezone, clearCache } = await import('../../.tai/hooks/lib/identity');
    clearCache();
    expect(typeof getTeamTimezone()).toBe('string');
  });

  it('findMemberByEmail returns null for unknown email', async () => {
    const { findMemberByEmail, clearCache } = await import('../../.tai/hooks/lib/identity');
    clearCache();
    expect(findMemberByEmail('nobody@example.com')).toBeNull();
  });

  it('getTeamMembers returns an array', async () => {
    const { getTeamMembers, clearCache } = await import('../../.tai/hooks/lib/identity');
    clearCache();
    expect(Array.isArray(getTeamMembers())).toBe(true);
  });

  it('clearCache allows re-reading config', async () => {
    const { getTeamConfig, clearCache } = await import('../../.tai/hooks/lib/identity');
    clearCache();
    const a = getTeamConfig();
    clearCache();
    const b = getTeamConfig();
    expect(a.name).toBe(b.name);
  });
});
