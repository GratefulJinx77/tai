import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TAI_DIR = '/home/wbj/alpha-root/builds/tai/.tai';
const HOOKS_DIR = join(TAI_DIR, 'hooks');
const SKILLS_DIR = join(TAI_DIR, 'skills');

function getAllFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  function walk(d: string) {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          results.push(fullPath);
        }
      }
    } catch { /* skip inaccessible dirs */ }
  }

  walk(dir);
  return results;
}

describe('anti-criteria verification', () => {
  describe('no role-based access gates', () => {
    it('no files use "role: architect" as an access gate', () => {
      const allFiles = [
        ...getAllFiles(TAI_DIR, '.ts'),
        ...getAllFiles(TAI_DIR, '.md'),
        ...getAllFiles(TAI_DIR, '.yaml'),
      ];

      for (const file of allFiles) {
        const content = readFileSync(file, 'utf-8');
        // Check for role gating patterns
        const hasRoleGate = /if\s*\(.*role\s*===?\s*['"]architect['"]/.test(content);
        if (hasRoleGate) {
          throw new Error(`Role-based access gate found in ${file}`);
        }
      }
    });
  });

  describe('no individual user attribution in logging hooks', () => {
    it('no hook files log user.name or user.email', () => {
      const hookFiles = getAllFiles(HOOKS_DIR, '.ts');

      for (const file of hookFiles) {
        const content = readFileSync(file, 'utf-8');
        // Check for logging that includes user identity
        const logsUserName = /console\.(log|error|warn)\(.*user\.name/.test(content);
        const logsUserEmail = /console\.(log|error|warn)\(.*user\.email/.test(content);

        if (logsUserName) {
          throw new Error(`Hook logs user.name: ${file}`);
        }
        if (logsUserEmail) {
          throw new Error(`Hook logs user.email: ${file}`);
        }
      }
    });
  });

  describe('no skill files have Role Access restrictions', () => {
    it('no skill files contain "Role Access" restriction blocks', () => {
      const skillFiles = getAllFiles(SKILLS_DIR, '.md');

      for (const file of skillFiles) {
        const content = readFileSync(file, 'utf-8');
        // Check for role access restriction patterns
        const hasRoleAccess = /##\s*Role Access|role_required:|access_roles:/i.test(content);
        if (hasRoleAccess) {
          throw new Error(`Role Access restriction found in ${file}`);
        }
      }
    });
  });

  describe('no PAI path references (~/.claude/)', () => {
    it('no .tai/ files reference ~/.claude/ paths', () => {
      const allFiles = [
        ...getAllFiles(TAI_DIR, '.ts'),
        ...getAllFiles(TAI_DIR, '.md'),
        ...getAllFiles(TAI_DIR, '.yaml'),
        ...getAllFiles(TAI_DIR, '.json'),
        ...getAllFiles(TAI_DIR, '.sh'),
      ];

      const violations: string[] = [];

      for (const file of allFiles) {
        // Skip node_modules and .git
        if (file.includes('node_modules') || file.includes('.git/')) continue;

        const content = readFileSync(file, 'utf-8');
        if (content.includes('~/.claude/') || content.includes('$HOME/.claude/') || content.includes('${HOME}/.claude/')) {
          violations.push(file);
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
