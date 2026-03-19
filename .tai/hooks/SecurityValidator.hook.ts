#!/usr/bin/env bun
/**
 * SecurityValidator.hook.ts - Security validation for tool calls (PreToolUse)
 *
 * Validates Bash commands and file operations against security patterns before
 * execution. Prevents accidental or malicious operations.
 *
 * TRIGGER: PreToolUse (matcher: Bash, Edit, Write, Read)
 *
 * Pattern categories:
 * - Bash: blocked (always prevented), confirm (user confirmation), alert (logged)
 * - Paths: zeroAccess, readOnly, confirmWrite, noDelete
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parse as parseYaml } from 'yaml';
import { taiPath } from './lib/paths';

// ========================================
// Security Event Logging
// ========================================

interface SecurityEvent {
  timestamp: string;
  session_id: string;
  event_type: 'block' | 'confirm' | 'alert' | 'allow';
  tool: string;
  category: 'bash_command' | 'path_access';
  target: string;
  pattern_matched?: string;
  reason?: string;
  action_taken: string;
}

function generateEventSummary(event: SecurityEvent): string {
  const eventWord = event.event_type;
  const source = event.reason || event.target || 'unknown';
  const words = source
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(0, 5);
  return [eventWord, ...words].join('-');
}

function getSecurityLogPath(event: SecurityEvent): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const sec = now.getSeconds().toString().padStart(2, '0');

  const summary = generateEventSummary(event);
  const timestamp = `${year}${month}${day}-${hour}${min}${sec}`;
  return taiPath('telemetry', 'security', year, month, `security-${summary}-${timestamp}.jsonl`);
}

function logSecurityEvent(event: SecurityEvent): void {
  try {
    const logPath = getSecurityLogPath(event);
    const dir = logPath.substring(0, logPath.lastIndexOf('/'));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(logPath, JSON.stringify(event, null, 2));
  } catch {
    console.error('Warning: Failed to log security event');
  }
}

// ========================================
// Types
// ========================================

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown> | string;
}

interface Pattern {
  pattern: string;
  reason: string;
}

interface PatternsConfig {
  version: string;
  philosophy: { mode: string; principle: string };
  bash: { trusted: Pattern[]; blocked: Pattern[]; confirm: Pattern[]; alert: Pattern[] };
  paths: { zeroAccess: string[]; readOnly: string[]; confirmWrite: string[]; noDelete: string[] };
  projects: Record<string, { path: string; rules: Array<{ action: string; reason: string }> }>;
}

// ========================================
// Config Loading
// ========================================

const PATTERNS_PATH = taiPath('config', 'security-patterns.yaml');

let patternsCache: PatternsConfig | null = null;

function loadPatterns(): PatternsConfig {
  if (patternsCache) return patternsCache;

  if (!existsSync(PATTERNS_PATH)) {
    return {
      version: '0.0',
      philosophy: { mode: 'permissive', principle: 'No patterns loaded - fail open' },
      bash: { trusted: [], blocked: [], confirm: [], alert: [] },
      paths: { zeroAccess: [], readOnly: [], confirmWrite: [], noDelete: [] },
      projects: {}
    };
  }

  try {
    const content = readFileSync(PATTERNS_PATH, 'utf-8');
    patternsCache = parseYaml(content) as PatternsConfig;
    return patternsCache;
  } catch (error) {
    console.error(`Failed to parse security-patterns.yaml:`, error);
    return {
      version: '0.0',
      philosophy: { mode: 'permissive', principle: 'Parse error - fail open' },
      bash: { trusted: [], blocked: [], confirm: [], alert: [] },
      paths: { zeroAccess: [], readOnly: [], confirmWrite: [], noDelete: [] },
      projects: {}
    };
  }
}

// ========================================
// Command Normalization
// ========================================

function stripEnvVarPrefix(command: string): string {
  return command.replace(
    /^\s*(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]*)\s+)*/,
    ''
  );
}

// ========================================
// Pattern Matching
// ========================================

function matchesPattern(command: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(command);
  } catch {
    return command.toLowerCase().includes(pattern.toLowerCase());
  }
}

function expandPath(path: string): string {
  if (path.startsWith('~')) return path.replace('~', homedir());
  return path;
}

function matchesPathPattern(filePath: string, pattern: string): boolean {
  const expandedPattern = expandPath(pattern);
  const expandedPath = expandPath(filePath);

  if (pattern.includes('*')) {
    let regexPattern = expandedPattern
      .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
      .replace(/\*/g, '<<<SINGLESTAR>>>')
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/<<<DOUBLESTAR>>>/g, '.*')
      .replace(/<<<SINGLESTAR>>>/g, '[^/]*');

    try {
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(expandedPath);
    } catch {
      return false;
    }
  }

  return expandedPath === expandedPattern ||
         expandedPath.startsWith(expandedPattern.endsWith('/') ? expandedPattern : expandedPattern + '/');
}

// ========================================
// Validation
// ========================================

function validateBashCommand(command: string): { action: 'allow' | 'block' | 'confirm' | 'alert'; reason?: string } {
  const patterns = loadPatterns();

  for (const p of (patterns.bash.trusted || [])) {
    if (matchesPattern(command, p.pattern)) return { action: 'allow' };
  }
  for (const p of patterns.bash.blocked) {
    if (matchesPattern(command, p.pattern)) return { action: 'block', reason: p.reason };
  }
  for (const p of patterns.bash.confirm) {
    if (matchesPattern(command, p.pattern)) return { action: 'confirm', reason: p.reason };
  }
  for (const p of patterns.bash.alert) {
    if (matchesPattern(command, p.pattern)) return { action: 'alert', reason: p.reason };
  }

  return { action: 'allow' };
}

type PathAction = 'read' | 'write' | 'delete';

function validatePath(filePath: string, action: PathAction): { action: 'allow' | 'block' | 'confirm'; reason?: string } {
  const patterns = loadPatterns();

  for (const p of patterns.paths.zeroAccess) {
    if (matchesPathPattern(filePath, p)) return { action: 'block', reason: `Zero access path: ${p}` };
  }
  if (action === 'write' || action === 'delete') {
    for (const p of patterns.paths.readOnly) {
      if (matchesPathPattern(filePath, p)) return { action: 'block', reason: `Read-only path: ${p}` };
    }
  }
  if (action === 'write') {
    for (const p of patterns.paths.confirmWrite) {
      if (matchesPathPattern(filePath, p)) return { action: 'confirm', reason: `Writing to protected file requires confirmation: ${p}` };
    }
  }
  if (action === 'delete') {
    for (const p of patterns.paths.noDelete) {
      if (matchesPathPattern(filePath, p)) return { action: 'block', reason: `Cannot delete protected path: ${p}` };
    }
  }

  return { action: 'allow' };
}

// ========================================
// Tool Handlers
// ========================================

function handleBash(input: HookInput): void {
  const rawCommand = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.command as string) || '';

  if (!rawCommand) { console.log(JSON.stringify({ continue: true })); return; }

  const command = stripEnvVarPrefix(rawCommand);
  const result = validateBashCommand(command);

  switch (result.action) {
    case 'block':
      logSecurityEvent({ timestamp: new Date().toISOString(), session_id: input.session_id, event_type: 'block', tool: 'Bash', category: 'bash_command', target: command.slice(0, 500), reason: result.reason, action_taken: 'Hard block - exit 2' });
      console.error(`[TAI SECURITY] BLOCKED: ${result.reason}`);
      process.exit(2);
      break;
    case 'confirm':
      logSecurityEvent({ timestamp: new Date().toISOString(), session_id: input.session_id, event_type: 'confirm', tool: 'Bash', category: 'bash_command', target: command.slice(0, 500), reason: result.reason, action_taken: 'Prompted user for confirmation' });
      console.log(JSON.stringify({ decision: 'ask', message: `[TAI SECURITY] ${result.reason}\n\nCommand: ${command.slice(0, 200)}\n\nProceed?` }));
      break;
    case 'alert':
      logSecurityEvent({ timestamp: new Date().toISOString(), session_id: input.session_id, event_type: 'alert', tool: 'Bash', category: 'bash_command', target: command.slice(0, 500), reason: result.reason, action_taken: 'Logged alert, allowed execution' });
      console.error(`[TAI SECURITY] ALERT: ${result.reason}`);
      console.log(JSON.stringify({ continue: true }));
      break;
    default:
      console.log(JSON.stringify({ continue: true }));
  }
}

function handleFileWrite(input: HookInput, toolName: string): void {
  const filePath = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.file_path as string) || '';

  if (!filePath) { console.log(JSON.stringify({ continue: true })); return; }

  const result = validatePath(filePath, 'write');

  switch (result.action) {
    case 'block':
      logSecurityEvent({ timestamp: new Date().toISOString(), session_id: input.session_id, event_type: 'block', tool: toolName, category: 'path_access', target: filePath, reason: result.reason, action_taken: 'Hard block - exit 2' });
      console.error(`[TAI SECURITY] BLOCKED: ${result.reason}`);
      process.exit(2);
      break;
    case 'confirm':
      logSecurityEvent({ timestamp: new Date().toISOString(), session_id: input.session_id, event_type: 'confirm', tool: toolName, category: 'path_access', target: filePath, reason: result.reason, action_taken: 'Prompted user for confirmation' });
      console.log(JSON.stringify({ decision: 'ask', message: `[TAI SECURITY] ${result.reason}\n\nPath: ${filePath}\n\nProceed?` }));
      break;
    default:
      console.log(JSON.stringify({ continue: true }));
  }
}

function handleRead(input: HookInput): void {
  const filePath = typeof input.tool_input === 'string'
    ? input.tool_input
    : (input.tool_input?.file_path as string) || '';

  if (!filePath) { console.log(JSON.stringify({ continue: true })); return; }

  const result = validatePath(filePath, 'read');
  if (result.action === 'block') {
    logSecurityEvent({ timestamp: new Date().toISOString(), session_id: input.session_id, event_type: 'block', tool: 'Read', category: 'path_access', target: filePath, reason: result.reason, action_taken: 'Hard block - exit 2' });
    console.error(`[TAI SECURITY] BLOCKED: ${result.reason}`);
    process.exit(2);
  }
  console.log(JSON.stringify({ continue: true }));
}

// ========================================
// Main
// ========================================

async function main(): Promise<void> {
  let input: HookInput;

  try {
    const reader = Bun.stdin.stream().getReader();
    let raw = '';
    const readLoop = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += new TextDecoder().decode(value, { stream: true });
      }
    })();

    const timeout = setTimeout(() => {
      if (!raw.trim()) {
        console.log(JSON.stringify({ continue: true }));
        process.exit(0);
      }
    }, 200);

    await Promise.race([readLoop, new Promise<void>(r => setTimeout(r, 200))]);
    clearTimeout(timeout);

    if (!raw.trim()) { console.log(JSON.stringify({ continue: true })); return; }

    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  switch (input.tool_name) {
    case 'Bash': handleBash(input); break;
    case 'Edit': case 'MultiEdit': handleFileWrite(input, input.tool_name); break;
    case 'Write': handleFileWrite(input, 'Write'); break;
    case 'Read': handleRead(input); break;
    default: console.log(JSON.stringify({ continue: true }));
  }
}

main().catch(() => { console.log(JSON.stringify({ continue: true })); });
