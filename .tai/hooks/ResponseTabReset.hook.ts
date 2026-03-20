#!/usr/bin/env bun
/**
 * ResponseTabReset.hook.ts -- Reset Kitty tab title/color after response
 *
 * Updates the Kitty terminal tab to show completion state after Claude
 * finishes responding. Converts the working title to past tense.
 *
 * TRIGGER: Stop
 */

import { readTabState, setTabState } from './lib/tab-setter';
import { isValidCompletionTitle, getCompletionFallback, gerundToPastTense } from './lib/output-validators';

async function main() {
  let sessionId: string | undefined;

  try {
    const raw = await Promise.race([
      Bun.stdin.text(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      sessionId = parsed.session_id;
    }
  } catch { /* timeout or parse failed */ }

  try {
    const current = readTabState(sessionId);
    if (current?.title) {
      // Convert gerund title to past tense
      const words = current.title.replace(/^[^\w]*/, '').split(/\s+/);
      if (words.length >= 2 && words[0].toLowerCase().endsWith('ing')) {
        words[0] = gerundToPastTense(words[0]);
        let completed = words.join(' ');
        if (!completed.endsWith('.')) completed += '.';
        if (isValidCompletionTitle(completed)) {
          setTabState({ title: completed, state: 'idle', sessionId });
          console.error(`[ResponseTabReset] Set completion title: "${completed}"`);
          process.exit(0);
        }
      }
    }

    setTabState({ title: getCompletionFallback(), state: 'idle', sessionId });
  } catch (err) {
    console.error('[ResponseTabReset] Handler failed:', err);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[ResponseTabReset] Fatal:', err);
  process.exit(0);
});
