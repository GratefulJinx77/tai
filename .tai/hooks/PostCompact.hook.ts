#!/usr/bin/env bun
/**
 * PostCompact.hook.ts -- Re-inject critical context after compaction
 *
 * After context compaction, in-flight state (Algorithm phase, PRD criteria,
 * key decisions) may be lost. This hook reads the pre-compact snapshot
 * and injects a recovery summary as additionalContext.
 *
 * TRIGGER: PostCompact
 */

import { readHookInput } from './lib/hook-io';
import { taiPath } from './lib/paths';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  const input = await readHookInput();

  const stateDir = taiPath('memory', 'state');
  const snapshotPath = join(stateDir, 'pre-compact-state.json');

  if (!existsSync(snapshotPath)) {
    process.exit(0);
  }

  try {
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
    const parts: string[] = ['[PostCompact Context Recovery]'];

    if (snapshot.active_prd) {
      const prd = snapshot.active_prd;
      parts.push(`Active PRD: ${prd.slug} | Phase: ${prd.phase} | Progress: ${prd.progress} | Task: ${prd.task}`);
    }

    if (snapshot.algorithm_state) {
      const algo = snapshot.algorithm_state;
      parts.push(`Algorithm State: phase=${algo.phase} | session=${algo.session_id}`);
    }

    if (snapshot.criteria_snapshot && snapshot.criteria_snapshot.length > 0) {
      const done = snapshot.criteria_snapshot.filter((c: any) => c.done).length;
      const total = snapshot.criteria_snapshot.length;
      parts.push(`Criteria: ${done}/${total} complete`);
      const pending = snapshot.criteria_snapshot.filter((c: any) => !c.done);
      if (pending.length > 0) {
        parts.push('Pending: ' + pending.map((c: any) => `${c.id}: ${c.text}`).join(' | '));
      }
    }

    if (parts.length > 1) {
      const output = {
        hookSpecificOutput: {
          hookEventName: 'PostCompact',
          additionalContext: parts.join('\n')
        }
      };
      console.log(JSON.stringify(output));
    }
  } catch (err) {
    console.error('[PostCompact] Error reading snapshot:', err);
  }
}

main().catch((err) => {
  console.error('[PostCompact] Fatal:', err);
}).finally(() => {
  process.exit(0);
});
