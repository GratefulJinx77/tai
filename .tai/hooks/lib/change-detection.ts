/**
 * change-detection.ts - Utilities for detecting TAI system changes
 *
 * Parses transcripts for file modification tool_use blocks and categorizes
 * changes to determine if background integrity maintenance is needed.
 */

import { readFileSync, existsSync } from 'fs';
import { join, relative, basename } from 'path';
import { getTaiDir } from './paths';

// ============================================================================
// Types
// ============================================================================

export interface FileChange {
  tool: 'Write' | 'Edit' | 'MultiEdit';
  path: string;
  category: ChangeCategory | null;
  isStructural: boolean;
}

export type ChangeCategory =
  | 'skill'
  | 'hook'
  | 'workflow'
  | 'config'
  | 'core-system'
  | 'memory-system'
  | 'documentation';

export type SignificanceLabel = 'trivial' | 'minor' | 'moderate' | 'major' | 'critical';

export type ChangeType =
  | 'skill_update'
  | 'structure_change'
  | 'doc_update'
  | 'hook_update'
  | 'workflow_update'
  | 'config_update'
  | 'tool_update'
  | 'multi_area';

export interface IntegrityState {
  last_run: string;
  last_changes_hash: string;
  cooldown_until: string | null;
}

// ============================================================================
// Path Constants
// ============================================================================

const TAI_DIR = getTaiDir();
const STATE_FILE = join(TAI_DIR, 'memory', 'state', 'integrity-state.json');

const EXCLUDED_PATHS = [
  'memory/work/',
  'memory/learnings/',
  'memory/state/',
  '.git/',
  'node_modules/',
];

const HIGH_PRIORITY_PATHS = [
  'CORE.md',
  'config/',
  'hooks/',
];

const STRUCTURAL_PATTERNS = [
  /config\/.*\.yaml$/i,
  /CORE\.md$/i,
  /hooks\/.*\.ts$/i,
];

// ============================================================================
// Transcript Parsing
// ============================================================================

export function parseToolUseBlocks(transcriptPath: string): FileChange[] {
  try {
    if (!existsSync(transcriptPath)) return [];

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');
    const changes: FileChange[] = [];
    const seenPaths = new Set<string>();

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        if (entry.type === 'assistant' && entry.message?.content) {
          const contentArray = Array.isArray(entry.message.content)
            ? entry.message.content
            : [];

          for (const block of contentArray) {
            if (block.type !== 'tool_use') continue;

            const toolName = block.name;
            const input = block.input || {};

            if (toolName === 'Write' && input.file_path) {
              const path = normalizeToRelativePath(input.file_path);
              if (!seenPaths.has(path)) {
                seenPaths.add(path);
                changes.push(createFileChange('Write', path));
              }
            } else if (toolName === 'Edit' && input.file_path) {
              const path = normalizeToRelativePath(input.file_path);
              if (!seenPaths.has(path)) {
                seenPaths.add(path);
                changes.push(createFileChange('Edit', path));
              }
            } else if (toolName === 'MultiEdit' && input.edits) {
              for (const edit of input.edits) {
                if (edit.file_path) {
                  const path = normalizeToRelativePath(edit.file_path);
                  if (!seenPaths.has(path)) {
                    seenPaths.add(path);
                    changes.push(createFileChange('Edit', path));
                  }
                }
              }
            }
          }
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    return changes;
  } catch {
    return [];
  }
}

function normalizeToRelativePath(absolutePath: string): string {
  if (absolutePath.startsWith(TAI_DIR)) {
    return relative(TAI_DIR, absolutePath);
  }
  return absolutePath;
}

function createFileChange(tool: 'Write' | 'Edit', path: string): FileChange {
  return {
    tool,
    path,
    category: categorizeChange(path),
    isStructural: isStructuralPath(path),
  };
}

// ============================================================================
// Change Categorization
// ============================================================================

export function categorizeChange(path: string): ChangeCategory | null {
  for (const excluded of EXCLUDED_PATHS) {
    if (path.includes(excluded)) return null;
  }

  const absolutePath = path.startsWith('/') ? path : join(TAI_DIR, path);
  if (!absolutePath.startsWith(TAI_DIR)) return null;

  if (path.includes('skills/')) return 'skill';
  if (path.includes('hooks/')) return 'hook';
  if (path.includes('config/')) return 'config';
  if (path.includes('memory/')) return 'memory-system';
  if (path.endsWith('.md')) return 'documentation';

  return null;
}

function isStructuralPath(path: string): boolean {
  for (const pattern of STRUCTURAL_PATTERNS) {
    if (pattern.test(path)) return true;
  }
  for (const highPriority of HIGH_PRIORITY_PATHS) {
    if (path.includes(highPriority)) return true;
  }
  return false;
}

// ============================================================================
// Significance Detection
// ============================================================================

export function isSignificantChange(changes: FileChange[]): boolean {
  const systemChanges = changes.filter(c => c.category !== null);
  if (systemChanges.length === 0) return false;
  if (systemChanges.some(c => c.isStructural)) return true;

  const categories = new Set(systemChanges.map(c => c.category));
  if (categories.size >= 1 && systemChanges.length >= 2) return true;

  const importantCategories: ChangeCategory[] = ['skill', 'hook', 'core-system'];
  if (systemChanges.some(c => importantCategories.includes(c.category!))) return true;

  return false;
}

export function shouldDocumentChanges(changes: FileChange[]): boolean {
  const systemChanges = changes.filter(c => c.category !== null);
  if (systemChanges.length === 0) return false;
  if (systemChanges.some(c => c.isStructural)) return true;

  const importantCategories: ChangeCategory[] = ['skill', 'hook', 'config'];
  if (systemChanges.some(c => c.category && importantCategories.includes(c.category))) return true;
  if (systemChanges.length >= 2) return true;

  const newFiles = systemChanges.filter(c => c.tool === 'Write');
  if (newFiles.length > 0) return true;

  return false;
}

// ============================================================================
// Throttling
// ============================================================================

const COOLDOWN_MINUTES = 2;

export function readIntegrityState(): IntegrityState | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const content = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function isInCooldown(): boolean {
  const state = readIntegrityState();
  if (!state?.cooldown_until) return false;
  const cooldownUntil = new Date(state.cooldown_until);
  return new Date() < cooldownUntil;
}

export function hashChanges(changes: FileChange[]): string {
  const sorted = changes
    .map(c => `${c.tool}:${c.path}`)
    .sort()
    .join('|');
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function isDuplicateRun(changes: FileChange[]): boolean {
  const state = readIntegrityState();
  if (!state?.last_changes_hash) return false;
  return hashChanges(changes) === state.last_changes_hash;
}

export function getCooldownEndTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + COOLDOWN_MINUTES);
  return now.toISOString();
}

// ============================================================================
// Significance and Change Type Determination
// ============================================================================

export function determineSignificance(changes: FileChange[]): SignificanceLabel {
  const count = changes.length;
  const hasStructural = changes.some(c => c.isStructural);
  const hasNewFiles = changes.some(c => c.tool === 'Write');

  const categories = new Set(changes.map(c => c.category).filter(Boolean));
  const hasHooks = changes.some(c => c.category === 'hook');
  const hasSkills = changes.some(c => c.category === 'skill');

  if (hasStructural && count >= 5) return 'critical';
  if (hasNewFiles && hasStructural) return 'major';
  if (categories.size >= 3) return 'major';
  if (hasHooks && count >= 3) return 'major';
  if (count >= 3 || categories.size >= 2) return 'moderate';
  if (hasSkills && count >= 2) return 'moderate';
  if (count === 1 && !hasStructural) return 'minor';

  return 'minor';
}

export function inferChangeType(changes: FileChange[]): ChangeType {
  const categories = changes.map(c => c.category).filter(Boolean);
  const uniqueCategories = new Set(categories);

  if (uniqueCategories.size >= 3) return 'multi_area';

  if (uniqueCategories.size === 1) {
    const cat = [...uniqueCategories][0];
    switch (cat) {
      case 'skill': return changes.some(c => c.isStructural) ? 'structure_change' : 'skill_update';
      case 'hook': return 'hook_update';
      case 'config': return 'config_update';
      case 'documentation': return 'doc_update';
      default: return 'skill_update';
    }
  }

  if (uniqueCategories.has('hook')) return 'hook_update';
  if (uniqueCategories.has('skill')) return 'skill_update';
  if (uniqueCategories.has('config')) return 'config_update';

  return 'multi_area';
}

export function generateDescriptiveTitle(changes: FileChange[]): string {
  const paths = changes.map(c => c.path);

  const hasHooks = paths.some(p => p.includes('hooks/'));
  const hasConfig = paths.some(p => p.includes('config/'));
  const hasSkills = paths.some(p => p.includes('skills/'));

  if (hasHooks) {
    const hookNames = paths
      .filter(p => p.includes('hooks/'))
      .map(p => basename(p, '.ts').replace('.hook', ''));
    if (hookNames.length === 1) return `TAI ${hookNames[0]} Hook Updated`;
    if (hookNames.length <= 3) return `TAI ${hookNames.slice(0, 3).join(', ')} Hooks Updated`;
    return 'TAI Hook System Updates';
  }
  if (hasConfig) return 'TAI System Configuration Updated';
  if (hasSkills) return 'TAI Skill Files Updated';

  const categories = new Set(changes.map(c => c.category).filter(Boolean));
  if (categories.size === 1) {
    const cat = [...categories][0];
    return `TAI ${cat!.charAt(0).toUpperCase() + cat!.slice(1)} Updates Applied`;
  }

  return 'TAI Multi-Area System Updates';
}
