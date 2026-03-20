#!/usr/bin/env bun
/**
 * ConfigChange.hook.ts -- Log configuration changes during session
 *
 * Detects when settings, project config, or skill files change
 * mid-session. Logs the change for observability.
 *
 * TRIGGER: ConfigChange
 * MATCHER: user_settings, project_settings, local_settings, policy_settings, skills
 */

import { readHookInput } from './lib/hook-io';
import { taiPath } from './lib/paths';
import { existsSync, mkdirSync, appendFileSync } from 'fs';

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  const event = {
    timestamp: new Date().toISOString(),
    session_id: input.session_id || 'unknown',
    config_source: (input as any).config_source || (input as any).matcher || 'unknown',
    config_path: (input as any).config_path || '',
    hook_event: 'ConfigChange',
  };

  try {
    appendFileSync(taiPath('memory', 'state', 'config-changes.jsonl'), JSON.stringify(event) + '\n', 'utf-8');
  } catch (err) {
    console.error('[ConfigChange] Failed to log:', err);
  }
}

main().catch((err) => {
  console.error('[ConfigChange] Fatal:', err);
}).finally(() => {
  process.exit(0);
});
