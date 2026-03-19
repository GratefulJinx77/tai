#!/usr/bin/env bun
/**
 * KittyEnvPersist.hook.ts - Kitty terminal env persistence + tab reset (SessionStart)
 *
 * Persists Kitty terminal environment variables to disk so hooks running later
 * (without terminal context) can control tabs. Also resets tab title at session start.
 *
 * TRIGGER: SessionStart
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { taiPath } from './lib/paths';
import { setTabState, readTabState } from './lib/tab-setter';
import { getTeamName } from './lib/identity';

// Skip for subagents
const isSubagent = process.env.CLAUDE_AGENT_TYPE !== undefined;
if (isSubagent) process.exit(0);

// Persist Kitty environment for hooks that run later without terminal context
const kittyListenOn = process.env.KITTY_LISTEN_ON;
const kittyWindowId = process.env.KITTY_WINDOW_ID;
if (kittyListenOn && kittyWindowId) {
  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    taiPath('memory', 'state', 'kitty-env.json'),
    JSON.stringify({ KITTY_LISTEN_ON: kittyListenOn, KITTY_WINDOW_ID: kittyWindowId }, null, 2)
  );
}

// Reset tab title to clean state
try {
  const current = readTabState();
  if (current && (current.state === 'working' || current.state === 'thinking')) {
    console.error(`[KittyEnvPersist] Tab in ${current.state} state -- preserving`);
  } else {
    setTabState({ title: `${getTeamName()} ready`, state: 'idle' });
    console.error('[KittyEnvPersist] Tab title reset to clean state');
  }
} catch (err) {
  console.error(`[KittyEnvPersist] Failed to reset tab title: ${err}`);
}

process.exit(0);
