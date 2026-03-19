#!/usr/bin/env bun
/**
 * TAIIntegrityCheck.hook.ts - TAI structure integrity validation (SessionEnd)
 *
 * Validates that the .tai/ directory structure is complete and healthy.
 * Checks for required directories, files, and configuration consistency.
 *
 * TRIGGER: SessionEnd
 * TAI-SPECIFIC: Yes
 */

import { taiPath } from './lib/paths';
import { existsSync, appendFileSync, mkdirSync } from 'fs';

const REQUIRED_DIRS = [
  'config',
  'context',
  'hooks',
  'hooks/lib',
  'memory',
  'memory/state',
  'roles',
  'skills',
  'telemetry',
];

const REQUIRED_FILES = [
  'CORE.md',
  'VERSION',
  'config/team.yaml',
  'config/project.yaml',
];

async function main() {
  // Read stdin for session_id
  let sessionId = 'unknown';
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
    if (input.trim()) {
      const parsed = JSON.parse(input);
      sessionId = parsed.session_id || 'unknown';
    }
  } catch {}

  const missingDirs: string[] = [];
  const missingFiles: string[] = [];

  for (const dir of REQUIRED_DIRS) {
    if (!existsSync(taiPath(dir))) {
      missingDirs.push(dir);
    }
  }

  for (const file of REQUIRED_FILES) {
    if (!existsSync(taiPath(file))) {
      missingFiles.push(file);
    }
  }

  if (missingDirs.length === 0 && missingFiles.length === 0) {
    console.error('[TAIIntegrityCheck] Structure OK');
    process.exit(0);
  }

  // Log findings
  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    missing_dirs: missingDirs,
    missing_files: missingFiles,
    total_issues: missingDirs.length + missingFiles.length,
  };

  try {
    appendFileSync(
      taiPath('memory', 'state', 'integrity-log.jsonl'),
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
  } catch {}

  console.error(`[TAIIntegrityCheck] ${logEntry.total_issues} issue(s): ${missingDirs.length} missing dirs, ${missingFiles.length} missing files`);
  process.exit(0);
}

main().catch(() => process.exit(0));
