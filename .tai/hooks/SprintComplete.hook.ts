#!/usr/bin/env bun
/**
 * SprintComplete.hook.ts -- PostToolUse hook for sprint PRD completion
 *
 * TRIGGER: PostToolUse (Edit, Write) on PRD.md files
 *
 * When a PRD.md in memory/work/ is edited and `phase` changes to `complete`,
 * AND the slug contains "sprint", this hook:
 *   1. Parses the PRD -- extracts sprint number, task, ISC count, slug
 *   2. Logs completion to sprint-completion.log
 *
 * Generic version -- project-specific cascades (roadmap updates, CI checks,
 * GitHub issue closure) should be configured per-project.
 *
 * Output schema: PostToolUse ({ hookSpecificOutput: { hookEventName, additionalContext } })
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { parseFrontmatter, countCriteria } from './lib/prd-utils';
import { taiPath } from './lib/paths';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const toolInput = input.tool_input || {};

async function main() {
  // Gate 1: Only PRD.md files in memory/work/
  const filePath: string = toolInput.file_path || '';
  if (!filePath.includes('memory/work/') && !filePath.includes('MEMORY/WORK/')) return;
  if (!filePath.endsWith('PRD.md')) return;

  // Gate 2: File must exist and have parseable frontmatter
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm) return;

  // Gate 3: Phase must be "complete"
  const newPhase = (fm.phase || '').toLowerCase();
  if (newPhase !== 'complete') return;

  // Gate 4: Slug must contain "sprint"
  const slug = fm.slug || '';
  if (!slug.toLowerCase().includes('sprint')) return;

  // Gate 5: Check if already processed
  const logDir = taiPath('memory', 'state');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
  const logPath = taiPath('memory', 'state', 'sprint-completion.log');
  if (existsSync(logPath)) {
    try {
      const log = readFileSync(logPath, 'utf-8');
      if (log.includes(`Slug: ${slug}`)) return;
    } catch { /* proceed if log read fails */ }
  }

  // Parse the PRD
  const taskName = fm.task || 'Unknown task';
  const { checked, total } = countCriteria(content);
  const iscString = `${checked}/${total}`;

  const sprintMatch = slug.match(/sprint[- ]?(\d+)/i);
  if (!sprintMatch) {
    console.error(`[SprintComplete] Could not extract sprint number from slug: ${slug}`);
    return;
  }
  const sprintNum = parseInt(sprintMatch[1], 10);

  // Log completion
  const logLine = `[${new Date().toISOString()}] Sprint ${sprintNum} COMPLETE | ${iscString} ISC | ${taskName} | Slug: ${slug}\n`;
  try {
    appendFileSync(logPath, logLine);
  } catch (err) {
    console.error(`[SprintComplete] Log write failed:`, err);
  }

  // Output: PostToolUse schema
  const summary = `Sprint ${sprintNum} completed (${iscString} ISC). ${taskName}.`;
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: summary,
    },
  }));
}

main().catch((err) => {
  console.error('[SprintComplete] Unhandled error:', err);
}).finally(() => {
  process.exit(0);
});
