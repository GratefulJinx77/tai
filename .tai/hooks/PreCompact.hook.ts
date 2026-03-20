#!/usr/bin/env bun
/**
 * PreCompact.hook.ts -- Preserve critical context before compaction
 *
 * When context hits the limit and gets compressed, in-flight state can be lost.
 * This hook dumps critical variables, decisions, and partial work to disk
 * before compression happens.
 *
 * TRIGGER: PreCompact
 */

import { readHookInput } from './lib/hook-io';
import { taiPath } from './lib/paths';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

async function main() {
  const input = await readHookInput();

  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const snapshot: Record<string, any> = {
    timestamp: new Date().toISOString(),
    session_id: input?.session_id || 'unknown',
    compaction_trigger: (input as any)?.compaction_trigger || 'unknown',
  };

  // Capture algorithm state if active
  const algoStatePath = '/tmp/tai-algorithm-state.json';
  if (existsSync(algoStatePath)) {
    try {
      snapshot.algorithm_state = JSON.parse(readFileSync(algoStatePath, 'utf-8'));
    } catch { /* silent */ }
  }

  // Find and capture active PRD state
  const workDir = taiPath('memory', 'work');
  if (existsSync(workDir)) {
    try {
      const dirsWithStats = readdirSync(workDir)
        .map(d => ({ name: d, stat: statSync(join(workDir, d)) }))
        .filter(item => item.stat.isDirectory())
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

      if (dirsWithStats.length > 0) {
        const latestPrd = join(workDir, dirsWithStats[0].name, 'PRD.md');
        if (existsSync(latestPrd)) {
          const content = readFileSync(latestPrd, 'utf-8');

          // Extract frontmatter
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) {
            const fm: Record<string, string> = {};
            for (const line of fmMatch[1].split('\n')) {
              const [key, ...rest] = line.split(':');
              if (key && rest.length > 0) {
                fm[key.trim()] = rest.join(':').trim();
              }
            }
            snapshot.active_prd = {
              slug: fm.slug || dirsWithStats[0].name,
              phase: fm.phase || 'unknown',
              progress: fm.progress || '0/0',
              task: fm.task || '',
              effort: fm.effort || '',
            };
          }

          // Extract criteria status
          const criteria: { id: string; text: string; done: boolean }[] = [];
          for (const line of content.split('\n')) {
            const match = line.match(/^- \[([ x])\] (ISC-\d+): (.+)/);
            if (match) {
              criteria.push({ id: match[2], text: match[3], done: match[1] === 'x' });
            }
          }
          if (criteria.length > 0) {
            snapshot.criteria_snapshot = criteria;
          }
        }
      }
    } catch (err) {
      console.error('[PreCompact] Error reading PRD:', err);
    }
  }

  // Write pre-compact snapshot
  try {
    writeFileSync(join(stateDir, 'pre-compact-state.json'), JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PreCompact] Failed to write snapshot:', err);
  }
}

main().catch((err) => {
  console.error('[PreCompact] Fatal:', err);
}).finally(() => {
  process.exit(0);
});
