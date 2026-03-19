#!/usr/bin/env bun
/**
 * IntegrityCheck.hook.ts - TAI Integrity Check (SessionEnd)
 *
 * Runs system integrity check -- detects TAI system file changes and logs them.
 * Doc cross-ref integrity is handled by DocIntegrity.hook.ts (Stop event).
 *
 * TRIGGER: SessionEnd
 */

import { taiPath } from './lib/paths';
import { parseToolUseBlocks, isSignificantChange, determineSignificance, inferChangeType, generateDescriptiveTitle } from './lib/change-detection';
import { existsSync, appendFileSync, mkdirSync } from 'fs';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

async function readStdin(): Promise<HookInput | null> {
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';
    const timeout = new Promise<void>(r => setTimeout(r, 500));
    const read = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();
    await Promise.race([read, timeout]);
    if (input.trim()) return JSON.parse(input) as HookInput;
  } catch {}
  return null;
}

async function main() {
  const hookInput = await readStdin();
  if (!hookInput?.transcript_path) process.exit(0);

  if (!existsSync(hookInput.transcript_path)) process.exit(0);

  const changes = parseToolUseBlocks(hookInput.transcript_path);
  if (changes.length === 0) process.exit(0);

  if (!isSignificantChange(changes)) process.exit(0);

  const significance = determineSignificance(changes);
  const changeType = inferChangeType(changes);
  const title = generateDescriptiveTitle(changes);

  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: hookInput.session_id,
    title,
    significance,
    change_type: changeType,
    changes_count: changes.filter(c => c.category !== null).length,
  };

  try {
    appendFileSync(
      taiPath('memory', 'state', 'integrity-log.jsonl'),
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
    console.error(`[IntegrityCheck] ${significance} change: ${title}`);
  } catch (err) {
    console.error('[IntegrityCheck] Log failed:', err);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
