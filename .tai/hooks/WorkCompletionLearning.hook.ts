#!/usr/bin/env bun
/**
 * WorkCompletionLearning.hook.ts - Extract learnings from completed work (SessionEnd)
 *
 * Bridges the work system to the learning system. When a session ends with
 * significant work completed, captures work metadata and creates a learning file.
 *
 * TRIGGER: SessionEnd
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp, getDateString } from './lib/time';
import { getLearningCategory } from './lib/learning-utils';
import { taiPath } from './lib/paths';

const MEMORY_DIR = taiPath('memory');
const STATE_DIR = join(MEMORY_DIR, 'state');
const WORK_DIR = join(MEMORY_DIR, 'work');
const LEARNING_DIR = join(MEMORY_DIR, 'learnings');

function findStateFile(sessionId?: string): string | null {
  if (sessionId) {
    const scoped = join(STATE_DIR, `current-work-${sessionId}.json`);
    if (existsSync(scoped)) return scoped;
  }
  const legacy = join(STATE_DIR, 'current-work.json');
  if (existsSync(legacy)) return legacy;
  return null;
}

interface CurrentWork {
  session_id: string;
  session_dir: string;
  created_at: string;
  prd_path?: string;
  current_task?: string;
  task_title?: string;
  task_count?: number;
}

function parseYaml(content: string): any {
  const meta: any = {};
  const lines = content.split('\n');
  let inArray = false;
  let arrayKey = '';
  let lineageSubKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && inArray) {
      const value = trimmed.slice(2).replace(/^["']|["']$/g, '');
      if (arrayKey === 'lineage') {
        if (lineageSubKey) meta.lineage[lineageSubKey].push(value);
      } else {
        meta[arrayKey].push(value);
      }
      continue;
    }

    const match = trimmed.match(/^([a-z_]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;

      if (key === 'lineage') {
        meta.lineage = { tools_used: [], files_changed: [], agents_spawned: [] };
        inArray = false;
        continue;
      }

      if (value === '[]') {
        if (meta.lineage) meta.lineage[key] = [];
        else meta[key] = [];
        inArray = false;
      } else if (value === '') {
        if (meta.lineage && ['tools_used', 'files_changed', 'agents_spawned'].includes(key)) {
          meta.lineage[key] = [];
          arrayKey = 'lineage';
          lineageSubKey = key;
          inArray = true;
        } else {
          meta[key] = [];
          arrayKey = key;
          inArray = true;
        }
      } else {
        const cleanValue = value.replace(/^["']|["']$/g, '');
        if (meta.lineage && ['tools_used', 'files_changed', 'agents_spawned'].includes(key)) {
          meta.lineage[key] = cleanValue === 'null' ? [] : [cleanValue];
        } else {
          meta[key] = cleanValue === 'null' ? null : cleanValue;
        }
        inArray = false;
      }
    }
  }

  return meta;
}

function getMonthDir(category: 'SYSTEM' | 'ALGORITHM'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthDir = join(LEARNING_DIR, category, `${year}-${month}`);
  if (!existsSync(monthDir)) mkdirSync(monthDir, { recursive: true });
  return monthDir;
}

function writeLearning(workMeta: any, idealContent: string): void {
  const category = getLearningCategory(workMeta.title || '');
  const monthDir = getMonthDir(category);

  const dateStr = getDateString();
  const timeStr = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');
  const titleSlug = (workMeta.title || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30);

  const filename = `${dateStr}_${timeStr}_work_${titleSlug}.md`;
  const filepath = join(monthDir, filename);

  if (existsSync(filepath)) return;

  let duration = 'Unknown';
  if (workMeta.created_at && workMeta.completed_at) {
    const start = new Date(workMeta.created_at);
    const end = new Date(workMeta.completed_at);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) {
      duration = `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      duration = `${hours}h ${mins}m`;
    }
  }

  const content = `# Work Completion Learning

**Title:** ${workMeta.title || 'Untitled'}
**Duration:** ${duration}
**Category:** ${category}
**Session:** ${workMeta.session_id || 'unknown'}

---

## Ideal State Criteria

${idealContent || 'Not specified'}

## What Was Done

- **Files Changed:** ${workMeta.lineage?.files_changed?.length || 0}
- **Tools Used:** ${workMeta.lineage?.tools_used?.join(', ') || 'None tracked'}
- **Agents Spawned:** ${workMeta.lineage?.agents_spawned?.length || 0}

## Insights

*This work session completed successfully. Consider what made it effective:*

- Was the approach straightforward or did it require iteration?
- Were there any blockers or surprises?
- What patterns from this work apply to future tasks?

---

*Auto-captured by WorkCompletionLearning hook at session end*
`;

  writeFileSync(filepath, content);
  console.error(`[WorkCompletionLearning] Created learning: ${filename}`);
}

async function main() {
  try {
    let sessionId: string | undefined;
    try {
      const input = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      if (input && input.trim()) {
        const parsed = JSON.parse(input);
        sessionId = parsed.session_id;
        if (parsed.agent_id) {
          console.error('[WorkCompletionLearning] Subagent session -- skipping');
          process.exit(0);
        }
      }
    } catch {
      // Timeout or parse error
    }

    const stateFile = findStateFile(sessionId);
    if (!stateFile) {
      console.error('[WorkCompletionLearning] No active work session');
      process.exit(0);
    }

    const currentWork: CurrentWork = JSON.parse(readFileSync(stateFile, 'utf-8'));

    if (sessionId && currentWork.session_id !== sessionId) {
      console.error('[WorkCompletionLearning] State file belongs to different session, skipping');
      process.exit(0);
    }

    if (!currentWork.session_dir) {
      console.error('[WorkCompletionLearning] No work directory in current session');
      process.exit(0);
    }

    const workPath = join(WORK_DIR, currentWork.session_dir);
    const prdPath = join(workPath, 'PRD.md');

    let workMeta: any = {};
    if (existsSync(prdPath)) {
      const prdContent = readFileSync(prdPath, 'utf-8');
      const fmMatch = prdContent.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) workMeta = parseYaml(fmMatch[1]);
    } else {
      console.error('[WorkCompletionLearning] No PRD.md found');
      process.exit(0);
    }

    if (!workMeta.completed_at) {
      workMeta.completed_at = getISOTimestamp();
    }

    let idealContent = '';
    if (existsSync(prdPath)) {
      try {
        const prdContent = readFileSync(prdPath, 'utf-8');
        const iscMatch = prdContent.match(/## IDEAL STATE CRITERIA[\s\S]*?(?=\n## |$)/);
        if (iscMatch) {
          const checked = (iscMatch[0].match(/- \[x\]/g) || []).length;
          const unchecked = (iscMatch[0].match(/- \[ \]/g) || []).length;
          const total = checked + unchecked;
          if (total > 0) {
            idealContent = `**ISC:** ${checked}/${total} criteria passing`;
          }
        }
      } catch { /* ignore */ }
    }

    const hasSignificantWork = (
      (workMeta.lineage?.files_changed?.length || 0) > 0 ||
      (currentWork.task_count ?? 0) > 1 ||
      workMeta.source === 'MANUAL'
    );

    if (hasSignificantWork) {
      writeLearning(workMeta, idealContent);
    } else {
      console.error('[WorkCompletionLearning] Trivial work session, skipping learning capture');
    }

    process.exit(0);
  } catch (error) {
    console.error(`[WorkCompletionLearning] Error: ${error}`);
    process.exit(0);
  }
}

main();
