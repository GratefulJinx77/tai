#!/usr/bin/env bun
/**
 * LastResponseCache.hook.ts -- Cache last response for RatingCapture bridge
 *
 * Caches the last assistant response text to disk so RatingCapture
 * (which fires on UserPromptSubmit) can access the previous response.
 *
 * TRIGGER: Stop
 */

import { readHookInput } from './lib/hook-io';
import { writeFileSync } from 'fs';
import { taiPath } from './lib/paths';

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  const lastResponse = input.last_assistant_message;

  if (lastResponse) {
    try {
      const cachePath = taiPath('memory', 'state', 'last-response.txt');
      writeFileSync(cachePath, lastResponse.slice(0, 2000), 'utf-8');
    } catch (err) {
      console.error('[LastResponseCache] Failed to write:', err);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[LastResponseCache] Fatal:', err);
  process.exit(0);
});
