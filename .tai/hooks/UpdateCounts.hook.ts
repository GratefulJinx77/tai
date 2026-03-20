#!/usr/bin/env bun
/**
 * UpdateCounts.hook.ts - System counts update (SessionEnd)
 *
 * Updates system counts (skills, hooks, ratings) and refreshes
 * usage cache. Runs at session end so dashboard has fresh data next session.
 *
 * TRIGGER: SessionEnd
 */

import { taiPath } from './lib/paths';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function countFiles(dir: string, extension: string): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir, { recursive: true })
      .filter(f => typeof f === 'string' && f.endsWith(extension))
      .length;
  } catch { return 0; }
}

function countRatings(): number {
  const ratingsPath = taiPath('memory', 'learnings', 'signals', 'ratings.jsonl');
  if (!existsSync(ratingsPath)) return 0;
  try {
    return readFileSync(ratingsPath, 'utf-8').trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

async function main() {
  try {
    const counts = {
      timestamp: new Date().toISOString(),
      skills: countFiles(taiPath('skills'), '.md'),
      hooks: countFiles(taiPath('hooks'), '.hook.ts'),
      agents: countFiles(taiPath('agents'), '.md'),
      ratings: countRatings(),
      learnings: countFiles(taiPath('memory', 'learnings'), '.md'),
    };

    const stateDir = taiPath('memory', 'state');
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

    writeFileSync(
      join(stateDir, 'system-counts.json'),
      JSON.stringify(counts, null, 2),
      'utf-8'
    );

    console.error(`[UpdateCounts] Skills: ${counts.skills}, Hooks: ${counts.hooks}, Agents: ${counts.agents}, Ratings: ${counts.ratings}`);
  } catch (err) {
    console.error('[UpdateCounts] Error:', err);
  }
  process.exit(0);
}

main();
