#!/usr/bin/env bun
/**
 * DocIntegrity.hook.ts -- Check cross-refs if system docs/hooks were modified
 *
 * Runs deterministic doc integrity checks when system files (hooks, skills,
 * config) were modified during the session. Self-gating: returns instantly
 * when no system files changed.
 *
 * TRIGGER: Stop
 */

import { readHookInput } from './lib/hook-io';
import { taiPath, getTaiDir } from './lib/paths';
import { parseToolUseBlocks, isSignificantChange, shouldDocumentChanges, generateDescriptiveTitle } from './lib/change-detection';
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  // Parse transcript for file changes
  if (!input.transcript_path || !existsSync(input.transcript_path)) {
    process.exit(0);
  }

  const changes = parseToolUseBlocks(input.transcript_path);
  if (changes.length === 0) process.exit(0);

  // Only proceed if significant TAI system changes detected
  if (!isSignificantChange(changes)) {
    console.error('[DocIntegrity] No significant system changes detected');
    process.exit(0);
  }

  // Log the change event
  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  const title = generateDescriptiveTitle(changes);
  const systemChanges = changes.filter(c => c.category !== null);

  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    title,
    changes_count: systemChanges.length,
    categories: [...new Set(systemChanges.map(c => c.category))],
    paths: systemChanges.map(c => c.path),
    should_document: shouldDocumentChanges(changes),
  };

  try {
    appendFileSync(
      taiPath('memory', 'state', 'doc-integrity.jsonl'),
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
    console.error(`[DocIntegrity] Logged ${systemChanges.length} system changes: ${title}`);
  } catch (err) {
    console.error('[DocIntegrity] Failed to log:', err);
  }

  // If changes should be documented, emit context for the agent
  if (shouldDocumentChanges(changes)) {
    const output = {
      systemMessage: `[DocIntegrity] ${title}: ${systemChanges.length} TAI system files changed. Consider updating documentation if structural changes were made.`
    };
    console.log(JSON.stringify(output));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[DocIntegrity] Fatal:', err);
  process.exit(0);
});
