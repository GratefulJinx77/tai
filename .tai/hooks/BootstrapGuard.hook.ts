#!/usr/bin/env bun
/**
 * BootstrapGuard.hook.ts — Prepend bootstrap instruction to user's first message
 *
 * When .tai/context/.bootstrap-pending exists, this hook intercepts the user's
 * first message and prepends a bootstrap execution directive. This makes the
 * bootstrap part of the user's message, which Claude always prioritizes over
 * system directives.
 *
 * TRIGGER: UserPromptSubmit
 * TIER: required
 *
 * Self-removing: once bootstrap-pending is deleted, this hook exits instantly.
 */

import { existsSync } from 'fs';
import { join } from 'path';

function getTaiDir(): string {
  // Walk up from cwd looking for .tai/
  let dir = process.cwd();
  while (dir !== '/') {
    if (existsSync(join(dir, '.tai'))) return join(dir, '.tai');
    dir = join(dir, '..');
  }
  return join(process.cwd(), '.tai');
}

async function main() {
  try {
    const taiDir = getTaiDir();
    const bootstrapPath = join(taiDir, 'context', '.bootstrap-pending');

    // Fast exit if no bootstrap pending — no cost to normal sessions
    if (!existsSync(bootstrapPath)) {
      process.exit(0);
    }

    // Bootstrap exists — inject directive into user's context
    const output = {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          "BEFORE answering this message, you MUST first execute the TAI bootstrap: " +
          "Read .tai/context/.bootstrap-pending and follow ALL its instructions " +
          "(read CLAUDE.md, extract architecture/boundaries/patterns/sprint into .tai/context/ files, " +
          "then delete .bootstrap-pending). After bootstrap is complete, answer the user's message."
      }
    };

    console.log(JSON.stringify(output));
    console.error('[BootstrapGuard] Bootstrap pending — injected directive into user prompt');
    process.exit(0);
  } catch (error) {
    console.error('[BootstrapGuard] Error:', error);
    process.exit(0);
  }
}

main();
