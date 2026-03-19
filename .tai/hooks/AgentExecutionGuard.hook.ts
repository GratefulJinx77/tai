#!/usr/bin/env bun
/**
 * AgentExecutionGuard.hook.ts - Enforce background agent execution (PreToolUse)
 *
 * When the Task tool is called without run_in_background: true and the
 * timing context is not "fast", injects a warning system-reminder.
 *
 * TRIGGER: PreToolUse (matcher: Task, Agent)
 */

interface HookInput {
  tool_name: string;
  tool_input: {
    run_in_background?: boolean;
    subagent_type?: string;
    description?: string;
    prompt?: string;
    model?: string;
    max_turns?: number;
  };
  agent_id?: string;
  agent_type?: string;
}

const FAST_AGENT_TYPES = ['Explore'];
const FAST_MODELS = ['haiku'];

async function readStdin(timeout = 1000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeout);
    process.stdin.on('data', chunk => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

async function main() {
  try {
    const input = await readStdin();
    if (!input) process.exit(0);

    const data: HookInput = JSON.parse(input);
    const toolInput = data.tool_input || {};

    if (toolInput.run_in_background === true) process.exit(0);

    const agentType = data.agent_type || toolInput.subagent_type || '';
    if (FAST_AGENT_TYPES.includes(agentType)) process.exit(0);

    const model = toolInput.model || '';
    if (FAST_MODELS.includes(model)) process.exit(0);

    const prompt = toolInput.prompt || '';
    if (/##\s*Scope[\s\S]*?Timing:\s*FAST/i.test(prompt)) process.exit(0);

    const desc = toolInput.description || agentType || 'unknown';

    console.log(`<system-reminder>
WARNING: FOREGROUND AGENT DETECTED -- "${desc}" (${agentType})
run_in_background is NOT set to true. This will BLOCK the user interface.

FIX: Add run_in_background: true to this Task call.

All non-fast agents should run in background:
- Spawn with run_in_background: true
- Report immediately: "Spawned [type] in background..."
- Poll with TaskOutput(block=false) every 15-30s
- Collect results when done

Only exceptions: Explore agents, haiku-model agents, and agents with ## Scope FAST.
</system-reminder>`);

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main();
