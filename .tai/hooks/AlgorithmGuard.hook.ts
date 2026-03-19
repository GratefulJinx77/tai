#!/usr/bin/env bun
/**
 * AlgorithmGuard.hook.ts -- Stop hook that prevents premature Algorithm termination
 *
 * When the Algorithm is running (session-scoped state file exists at
 * /tmp/tai-algorithm-state-{session_id}.json), this hook blocks Claude from
 * stopping until the Algorithm reaches COMPLETE or LEARN phase.
 *
 * TRIGGER: Stop
 */

import { readFileSync, existsSync } from 'fs';

const TERMINAL_PHASES = ['complete', 'learn'];

function stateFilePath(sessionId: string): string {
  return `/tmp/tai-algorithm-state-${sessionId}.json`;
}

interface StopInput {
  session_id: string;
  stop_hook_active: boolean;
  last_assistant_message: string;
  hook_event_name: string;
}

interface AlgorithmState {
  phase: string;
  session_id?: string;
  started?: string;
  updated?: string;
  task?: string;
}

async function main() {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const input: StopInput = JSON.parse(Buffer.concat(chunks).toString());

    // Safety valve: prevent infinite loop
    if (input.stop_hook_active) {
      console.error('[AlgorithmGuard] stop_hook_active=true, allowing stop (loop prevention)');
      process.exit(0);
    }

    if (!input.session_id) {
      process.exit(0);
    }

    const stateFile = stateFilePath(input.session_id);

    if (!existsSync(stateFile)) {
      process.exit(0);
    }

    let state: AlgorithmState;
    try {
      state = JSON.parse(readFileSync(stateFile, 'utf-8'));
    } catch {
      process.exit(0);
    }

    const phase = state.phase?.toLowerCase();

    if (!phase || TERMINAL_PHASES.includes(phase)) {
      process.exit(0);
    }

    // Non-terminal phase -- block stop
    const reason = `Algorithm is in phase "${phase}" (task: ${state.task || 'unknown'}). ` +
      `Complete the remaining Algorithm phases before stopping. ` +
      `Read ${stateFile} for current state.`;

    console.error(`[AlgorithmGuard] blocking stop -- phase="${phase}"`);

    console.log(JSON.stringify({ decision: 'block', reason }));
    process.exit(0);
  } catch (error) {
    console.error(`[AlgorithmGuard] error: ${error}`);
    process.exit(0);
  }
}

main();
