#!/usr/bin/env bun
/**
 * SubagentStop.hook.ts -- Log subagent completion + auto-scaffold agent memory
 *
 * 1. Tracks which agents completed in this session (agent-sessions.json)
 * 2. Auto-scaffolds agent-memory/{name}/MEMORY.md for custom agents on first completion
 *
 * TRIGGER: SubagentStop
 */

import { readHookInput } from './lib/hook-io';
import { taiPath } from './lib/paths';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const EPHEMERAL_TYPES = new Set([
  'unknown', 'general-purpose', 'Explore', 'Plan', 'Coder',
]);

function scaffoldAgentMemory(agentType: string): void {
  if (EPHEMERAL_TYPES.has(agentType)) return;

  const memDir = taiPath('memory', 'agents', agentType);
  const memFile = taiPath('memory', 'agents', agentType, 'MEMORY.md');

  if (existsSync(memFile)) return;

  try {
    mkdirSync(memDir, { recursive: true });
    writeFileSync(memFile, `# ${agentType} Memory\n\n*Auto-created on first agent completion. Record stable patterns, key decisions, and recurring solutions here.*\n`, 'utf-8');
    console.error(`[SubagentStop] Scaffolded agent memory: ${agentType}/MEMORY.md`);
  } catch (err) {
    console.error(`[SubagentStop] Failed to scaffold memory for ${agentType}:`, err);
  }
}

async function main() {
  const input = await readHookInput();
  if (!input?.session_id) process.exit(0);

  const stateDir = taiPath('memory', 'state');
  const sessionsFile = taiPath('memory', 'state', 'agent-sessions.json');

  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  let sessions: Record<string, any> = {};
  if (existsSync(sessionsFile)) {
    try {
      sessions = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
    } catch { /* corrupted -- start fresh */ }
  }

  const agentType = (input as any).agent_type || (input as any).subagent_type || 'unknown';
  const agentId = (input as any).agent_id || undefined;
  const sessionId = input.session_id;

  if (!sessions[sessionId]) {
    sessions[sessionId] = { agents: [] };
  }

  sessions[sessionId].agents.push({
    type: agentType,
    agent_id: agentId,
    completed_at: new Date().toISOString(),
    hook_event: 'SubagentStop',
  });

  try {
    writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SubagentStop] Failed to write:', err);
  }

  scaffoldAgentMemory(agentType);
}

main().catch((err) => {
  console.error('[SubagentStop] Fatal:', err);
}).finally(() => {
  process.exit(0);
});
