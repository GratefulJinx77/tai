/**
 * Centralized Path Resolution for TAI
 *
 * Resolves paths relative to the .tai/ directory, found by walking up
 * from cwd looking for .tai/. Replaces PAI's ~/.claude-based resolution.
 *
 * Usage:
 *   import { getTaiDir, taiPath } from './lib/paths';
 *   const taiDir = getTaiDir(); // Returns absolute path to .tai/
 */

import { existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';

/**
 * Expand shell variables in a path string
 * Supports: $HOME, ${HOME}, ~
 */
export function expandPath(path: string): string {
  const home = homedir();

  return path
    .replace(/^\$HOME(?=\/|$)/, home)
    .replace(/^\$\{HOME\}(?=\/|$)/, home)
    .replace(/^~(?=\/|$)/, home);
}

let cachedTaiDir: string | null = null;

/**
 * Find the .tai/ directory by walking up from cwd.
 * Priority: TAI_DIR env var (expanded) -> walk up from cwd
 */
export function getTaiDir(): string {
  if (cachedTaiDir) return cachedTaiDir;

  const envTaiDir = process.env.TAI_DIR;
  if (envTaiDir) {
    cachedTaiDir = expandPath(envTaiDir);
    return cachedTaiDir;
  }

  // Walk up from cwd looking for .tai/
  let dir = process.cwd();
  const root = '/';
  while (dir !== root) {
    const candidate = join(dir, '.tai');
    if (existsSync(candidate)) {
      cachedTaiDir = candidate;
      return cachedTaiDir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback: cwd/.tai (may not exist yet)
  cachedTaiDir = join(process.cwd(), '.tai');
  return cachedTaiDir;
}

/**
 * Get the project root (parent of .tai/)
 */
export function getProjectRoot(): string {
  return dirname(getTaiDir());
}

/**
 * Get a path relative to TAI_DIR
 */
export function taiPath(...segments: string[]): string {
  return join(getTaiDir(), ...segments);
}

/**
 * Get the hooks directory
 */
export function getHooksDir(): string {
  return taiPath('hooks');
}

/**
 * Get the skills directory
 */
export function getSkillsDir(): string {
  return taiPath('skills');
}

/**
 * Get the memory directory
 */
export function getMemoryDir(): string {
  return taiPath('memory');
}

/**
 * Get the config directory
 */
export function getConfigDir(): string {
  return taiPath('config');
}

/**
 * Get the telemetry directory
 */
export function getTelemetryDir(): string {
  return taiPath('telemetry');
}
