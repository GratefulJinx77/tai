#!/usr/bin/env bun
/**
 * QuestionAnswered.hook.ts - Reset tab after question answered (PostToolUse)
 *
 * Resets the terminal tab from question state (teal) back to working state (orange)
 * after the user answers an AskUserQuestion prompt.
 *
 * TRIGGER: PostToolUse (matcher: AskUserQuestion)
 */

import { setTabState, readTabState, stripPrefix } from './lib/tab-setter';

async function main() {
  try {
    let sessionId: string | undefined;
    try {
      const raw = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('stdin timeout')), 2000)),
      ]);
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        sessionId = parsed.session_id;
      }
    } catch { /* stdin timeout or parse failed */ }

    const currentState = readTabState(sessionId);
    let restoredTitle = 'Processing answer.';

    if (currentState?.previousTitle) {
      const rawTitle = stripPrefix(currentState.previousTitle);
      if (rawTitle) restoredTitle = rawTitle;
    }

    setTabState({ title: restoredTitle, state: 'working', sessionId });
    console.error('[QuestionAnswered] Tab reset to working state');
  } catch {
    console.error('[QuestionAnswered] Kitty remote control unavailable');
  }

  process.exit(0);
}

main();
