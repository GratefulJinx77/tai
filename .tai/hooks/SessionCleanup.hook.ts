#!/usr/bin/env bun
/**
 * SessionCleanup.hook.ts - Mark work complete and clear state (SessionEnd)
 *
 * Finalizes a session by marking the current work directory as COMPLETED,
 * clearing session state, resetting tab, and cleaning up session name entries.
 *
 * TRIGGER: SessionEnd
 * MUST RUN AFTER: WorkCompletionLearning (learning capture uses state before clear)
 */

import { writeFileSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp } from './lib/time';
import { setTabState, cleanupKittySession } from './lib/tab-setter';
import { taiPath } from './lib/paths';

const STATE_DIR = taiPath('memory', 'state');
const WORK_DIR = taiPath('memory', 'work');

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

function clearSessionWork(sessionId?: string): void {
  try {
    const stateFile = findStateFile(sessionId);
    if (!stateFile) {
      console.error('[SessionCleanup] No current work to complete');
      return;
    }

    const content = readFileSync(stateFile, 'utf-8');
    const currentWork: CurrentWork = JSON.parse(content);

    if (sessionId && currentWork.session_id !== sessionId) {
      console.error('[SessionCleanup] State file belongs to different session, skipping');
      return;
    }

    // Mark work directory as COMPLETED
    if (currentWork.session_dir) {
      const workPath = join(WORK_DIR, currentWork.session_dir);
      const prdPath = join(workPath, 'PRD.md');

      if (existsSync(prdPath)) {
        let prdContent = readFileSync(prdPath, 'utf-8');
        prdContent = prdContent.replace(/^status: ACTIVE$/m, 'status: COMPLETED');
        prdContent = prdContent.replace(/^completed_at: null$/m, `completed_at: "${getISOTimestamp()}"`);
        writeFileSync(prdPath, prdContent, 'utf-8');
        console.error(`[SessionCleanup] Marked work directory as COMPLETED: ${currentWork.session_dir}`);
      }
    }

    // Delete state file
    unlinkSync(stateFile);
    console.error('[SessionCleanup] Cleared session work state');

    // Clean session-names.json entry
    if (sessionId || currentWork.session_id) {
      const sid = sessionId || currentWork.session_id;
      const snPath = join(STATE_DIR, 'session-names.json');
      try {
        if (existsSync(snPath)) {
          const names = JSON.parse(readFileSync(snPath, 'utf-8'));
          if (names[sid]) {
            delete names[sid];
            writeFileSync(snPath, JSON.stringify(names, null, 2), 'utf-8');
          }
        }
      } catch (e) {
        console.error(`[SessionCleanup] Failed to clean session-names.json: ${e}`);
      }
    }
  } catch (error) {
    console.error(`[SessionCleanup] Error clearing session work: ${error}`);
  }
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
      }
    } catch { /* timeout or parse error */ }

    clearSessionWork(sessionId);

    // Reset tab
    try {
      setTabState({ title: '', state: 'idle', sessionId });
    } catch {
      console.error('[SessionCleanup] Tab reset failed (non-critical)');
    }

    if (sessionId) {
      cleanupKittySession(sessionId);
    }

    console.error('[SessionCleanup] Session ended, work marked complete');
    process.exit(0);
  } catch (error) {
    console.error(`[SessionCleanup] Error: ${error}`);
    process.exit(0);
  }
}

main();
