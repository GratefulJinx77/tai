#!/usr/bin/env bun
/**
 * TAIBuildCLAUDE.hook.ts - Auto-rebuild CLAUDE.md when TAI config changes
 *
 * When TAI system files (CORE.md, config/*.yaml, context/*.md) are modified,
 * validates that CLAUDE.md references are still accurate and logs if a
 * rebuild may be needed.
 *
 * TRIGGER: PostToolUse (matcher: Write, Edit)
 * TAI-SPECIFIC: Yes
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { taiPath, getTaiDir, getProjectRoot } from './lib/paths';
import { join } from 'path';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const toolInput = input.tool_input || {};

const TAI_SYSTEM_PATTERNS = [
  'CORE.md',
  'config/',
  'context/',
  'roles/',
  'VERSION',
];

async function main() {
  const filePath = toolInput.file_path || '';
  const taiDir = getTaiDir();

  // Only trigger for TAI system files
  const isSystemFile = TAI_SYSTEM_PATTERNS.some(pattern => {
    if (filePath.startsWith(taiDir)) {
      const relative = filePath.slice(taiDir.length + 1);
      return relative.startsWith(pattern) || relative === pattern;
    }
    return false;
  });

  if (!isSystemFile) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Check if CLAUDE.md exists and might need updating
  const claudeMdPath = join(getProjectRoot(), 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Log that a system file changed
  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: input.session_id || 'unknown',
    modified_file: filePath.slice(taiDir.length + 1),
    claude_md_exists: true,
  };

  try {
    appendFileSync(
      taiPath('memory', 'state', 'claude-rebuild-triggers.jsonl'),
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
  } catch {}

  // Emit context so the agent knows CLAUDE.md might need updating
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `[TAIBuildCLAUDE] TAI system file modified: ${logEntry.modified_file}. If this changes the project's session initialization or team configuration, CLAUDE.md may need updating.`
    }
  }));

  process.exit(0);
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});
