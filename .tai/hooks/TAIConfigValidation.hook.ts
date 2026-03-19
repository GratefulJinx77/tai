#!/usr/bin/env bun
/**
 * TAIConfigValidation.hook.ts - Validate TAI config files on change
 *
 * When TAI config files (team.yaml, project.yaml, models.yaml) are modified,
 * validates their structure and reports errors.
 *
 * TRIGGER: PostToolUse (matcher: Write, Edit)
 * TAI-SPECIFIC: Yes
 */

import { readFileSync, existsSync } from 'fs';
import { taiPath, getTaiDir } from './lib/paths';

let input: any;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch {
  process.exit(0);
}

const toolInput = input.tool_input || {};

function validateTeamYaml(content: string): string[] {
  const errors: string[] = [];
  if (!content.match(/^name:/m)) errors.push('team.yaml: missing "name" field');
  if (!content.match(/^timezone:/m)) errors.push('team.yaml: missing "timezone" field');
  if (!content.match(/^members:/m)) errors.push('team.yaml: missing "members" section');
  return errors;
}

function validateProjectYaml(content: string): string[] {
  const errors: string[] = [];
  if (!content.match(/^name:/m)) errors.push('project.yaml: missing "name" field');
  if (!content.match(/^stack:/m) && !content.match(/^language:/m)) {
    errors.push('project.yaml: missing "stack" or "language" field');
  }
  return errors;
}

async function main() {
  const filePath = toolInput.file_path || '';
  const taiDir = getTaiDir();

  // Only trigger for TAI config files
  if (!filePath.startsWith(taiDir) && !filePath.includes('.tai/config/')) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  if (!filePath.endsWith('.yaml') && !filePath.endsWith('.yml')) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  if (!existsSync(filePath)) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const content = readFileSync(filePath, 'utf-8');
  let errors: string[] = [];

  if (filePath.endsWith('team.yaml')) {
    errors = validateTeamYaml(content);
  } else if (filePath.endsWith('project.yaml')) {
    errors = validateProjectYaml(content);
  }

  if (errors.length > 0) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[TAIConfigValidation] Config validation errors:\n${errors.map(e => `  - ${e}`).join('\n')}`
      }
    }));
  } else {
    console.log(JSON.stringify({ continue: true }));
  }

  process.exit(0);
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});
