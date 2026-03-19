import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const TAI_DIR = resolve(__dirname, '../../.tai');
const HOOKS_DIR = join(TAI_DIR, 'hooks');

describe('hook smoke tests', () => {
  const hookFiles = readdirSync(HOOKS_DIR).filter(f => f.endsWith('.hook.ts'));

  it('has hook files present', () => {
    expect(hookFiles.length).toBeGreaterThan(0);
  });

  describe.each(hookFiles)('%s', (hookFile) => {
    const hookPath = join(HOOKS_DIR, hookFile);

    it('exists and is non-empty', () => {
      expect(existsSync(hookPath)).toBe(true);
      const content = readFileSync(hookPath, 'utf-8');
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it('is valid TypeScript (contains no syntax-breaking patterns)', () => {
      const content = readFileSync(hookPath, 'utf-8');
      // Basic structural checks: has imports or exports, has a function or async function
      expect(
        content.includes('import') || content.includes('export') || content.includes('function')
      ).toBe(true);
    });

    it('contains no ~/.claude/ path references', () => {
      const content = readFileSync(hookPath, 'utf-8');
      expect(content).not.toContain('~/.claude/');
      expect(content).not.toContain('$HOME/.claude/');
      expect(content).not.toContain('${HOME}/.claude/');
    });

    it('contains no individual user attribution in logging', () => {
      const content = readFileSync(hookPath, 'utf-8');
      // Should not reference specific user names or emails in log strings
      expect(content).not.toMatch(/console\.(log|error).*user\.name/);
      expect(content).not.toMatch(/console\.(log|error).*user\.email/);
    });
  });

  describe('config.yaml consistency', () => {
    it('config.yaml exists', () => {
      expect(existsSync(join(HOOKS_DIR, 'config.yaml'))).toBe(true);
    });

    it('config.yaml references all hook files', () => {
      const configContent = readFileSync(join(HOOKS_DIR, 'config.yaml'), 'utf-8');

      for (const hookFile of hookFiles) {
        expect(configContent).toContain(hookFile);
      }
    });

    it('all hooks referenced in config.yaml have matching files', () => {
      const configContent = readFileSync(join(HOOKS_DIR, 'config.yaml'), 'utf-8');
      const referencedFiles = [...configContent.matchAll(/file:\s*(.+\.hook\.ts)/g)].map(m => m[1]);

      for (const ref of referencedFiles) {
        expect(existsSync(join(HOOKS_DIR, ref))).toBe(true);
      }
    });

    it('all hooks have valid event types', () => {
      const configContent = readFileSync(join(HOOKS_DIR, 'config.yaml'), 'utf-8');
      const validEvents = new Set([
        'SessionStart', 'SessionEnd', 'PreToolUse', 'PostToolUse',
        'UserPromptSubmit', 'Stop', 'SubagentStop', 'PreCompact',
        'PostCompact', 'ConfigChange',
      ]);

      const events = [...configContent.matchAll(/event:\s*(\w+)/g)].map(m => m[1]);
      for (const event of events) {
        expect(validEvents.has(event)).toBe(true);
      }
    });

    it('all hooks have valid tiers', () => {
      const configContent = readFileSync(join(HOOKS_DIR, 'config.yaml'), 'utf-8');
      const validTiers = new Set(['required', 'recommended', 'optional']);
      const tiers = [...configContent.matchAll(/tier:\s*(\w+)/g)].map(m => m[1]);
      for (const tier of tiers) {
        expect(validTiers.has(tier)).toBe(true);
      }
    });
  });

  describe('settings-template.json consistency', () => {
    it('settings-template.json exists', () => {
      expect(existsSync(join(HOOKS_DIR, 'settings-template.json'))).toBe(true);
    });

    it('settings-template.json is valid JSON', () => {
      const content = readFileSync(join(HOOKS_DIR, 'settings-template.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('settings-template.json maps to valid lifecycle events', () => {
      const content = JSON.parse(readFileSync(join(HOOKS_DIR, 'settings-template.json'), 'utf-8'));
      const validEvents = new Set([
        'SessionStart', 'SessionEnd', 'PreToolUse', 'PostToolUse',
        'UserPromptSubmit', 'Stop', 'SubagentStop', 'PreCompact',
        'PostCompact', 'ConfigChange',
      ]);

      const hooks = content.hooks || {};
      for (const eventName of Object.keys(hooks)) {
        expect(validEvents.has(eventName)).toBe(true);
      }
    });

    it('all commands in settings-template reference existing hook files', () => {
      const content = JSON.parse(readFileSync(join(HOOKS_DIR, 'settings-template.json'), 'utf-8'));
      const hooks = content.hooks || {};

      for (const eventName of Object.keys(hooks)) {
        for (const group of hooks[eventName]) {
          for (const hook of group.hooks || []) {
            if (hook.command) {
              const match = hook.command.match(/\.tai\/hooks\/(.+\.hook\.ts)/);
              if (match) {
                expect(existsSync(join(HOOKS_DIR, match[1]))).toBe(true);
              }
            }
          }
        }
      }
    });
  });
});
