#!/usr/bin/env bun
/**
 * TAIDocIntegrity.hook.ts - TAI-specific document integrity validation
 *
 * Validates that TAI documentation files (CORE.md, CLAUDE.md, config files)
 * remain internally consistent after modifications. Checks cross-references
 * between config files and documentation.
 *
 * TRIGGER: Stop
 * TAI-SPECIFIC: Yes (validates TAI structure, not project files)
 */

import { readHookInput } from './lib/hook-io';
import { taiPath, getTaiDir } from './lib/paths';
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';

interface IntegrityIssue {
  severity: 'warning' | 'error';
  file: string;
  message: string;
}

function checkCoreMdIntegrity(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const corePath = taiPath('CORE.md');

  if (!existsSync(corePath)) {
    issues.push({ severity: 'error', file: 'CORE.md', message: 'CORE.md is missing' });
    return issues;
  }

  const content = readFileSync(corePath, 'utf-8');

  // Check that referenced config files exist
  const configRefs = content.matchAll(/config\/([a-z-]+\.yaml)/g);
  for (const match of configRefs) {
    const configPath = taiPath('config', match[1]);
    if (!existsSync(configPath)) {
      issues.push({ severity: 'warning', file: 'CORE.md', message: `References config/${match[1]} but file not found` });
    }
  }

  // Check that VERSION file exists and is referenced
  const versionPath = taiPath('VERSION');
  if (!existsSync(versionPath)) {
    issues.push({ severity: 'warning', file: 'VERSION', message: 'VERSION file is missing' });
  }

  return issues;
}

function checkConfigConsistency(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  // Check team.yaml exists
  const teamPath = taiPath('config', 'team.yaml');
  if (!existsSync(teamPath)) {
    issues.push({ severity: 'warning', file: 'config/team.yaml', message: 'team.yaml not found' });
  }

  // Check project.yaml exists
  const projectPath = taiPath('config', 'project.yaml');
  if (!existsSync(projectPath)) {
    issues.push({ severity: 'warning', file: 'config/project.yaml', message: 'project.yaml not found' });
  }

  return issues;
}

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  // Only run if we have a transcript to check for changes
  if (!input.transcript_path || !existsSync(input.transcript_path)) {
    process.exit(0);
  }

  // Check if any TAI files were modified in this session
  const transcript = readFileSync(input.transcript_path, 'utf-8');
  const taiDir = getTaiDir();
  if (!transcript.includes(taiDir) && !transcript.includes('.tai/')) {
    process.exit(0);
  }

  // Run integrity checks
  const issues: IntegrityIssue[] = [
    ...checkCoreMdIntegrity(),
    ...checkConfigConsistency(),
  ];

  if (issues.length === 0) {
    console.error('[TAIDocIntegrity] All integrity checks passed');
    process.exit(0);
  }

  // Log issues
  const stateDir = taiPath('memory', 'state');
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    issues,
  };

  try {
    appendFileSync(
      taiPath('memory', 'state', 'doc-integrity.jsonl'),
      JSON.stringify(logEntry) + '\n',
      'utf-8'
    );
  } catch {}

  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    const output = {
      systemMessage: `[TAIDocIntegrity] ${errors.length} error(s) found: ${errors.map(e => e.message).join('; ')}`
    };
    console.log(JSON.stringify(output));
  }

  console.error(`[TAIDocIntegrity] ${issues.length} issue(s) found`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[TAIDocIntegrity] Fatal:', err);
  process.exit(0);
});
