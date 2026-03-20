#!/usr/bin/env bun
/**
 * SessionAutoName.hook.ts - Auto-generate concise session names
 *
 * Generates a 4-word session title on the FIRST user prompt in a session.
 *
 * TRIGGER: UserPromptSubmit
 *
 * Note: PAI version uses inference for name upgrades. TAI version uses
 * deterministic extraction only (no inference dependency).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmdirSync, renameSync, statSync } from 'fs';
import { dirname } from 'path';
import { taiPath } from './lib/paths';
import { updateSessionNameInWorkJson, upsertSession } from './lib/prd-utils';

interface HookInput {
  session_id: string;
  prompt?: string;
  user_prompt?: string;
}

const SESSION_NAMES_PATH = taiPath('memory', 'state', 'session-names.json');
const LOCK_PATH = SESSION_NAMES_PATH + '.lock';
const LOCK_TIMEOUT = 3000;
const LOCK_STALE = 10000;

interface SessionNames {
  [sessionId: string]: string;
}

function acquireLock(): boolean {
  const deadline = Date.now() + LOCK_TIMEOUT;
  while (Date.now() < deadline) {
    try {
      mkdirSync(LOCK_PATH);
      return true;
    } catch {
      try {
        const stat = statSync(LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE) {
          try { rmdirSync(LOCK_PATH); } catch {}
          continue;
        }
      } catch {}
      Bun.sleepSync(50);
    }
  }
  return false;
}

function releaseLock(): void {
  try { rmdirSync(LOCK_PATH); } catch {}
}

function readSessionNames(): SessionNames {
  try {
    if (existsSync(SESSION_NAMES_PATH)) {
      return JSON.parse(readFileSync(SESSION_NAMES_PATH, 'utf-8'));
    }
  } catch {
    try {
      const bakPath = SESSION_NAMES_PATH + '.bak';
      if (existsSync(bakPath)) {
        return JSON.parse(readFileSync(bakPath, 'utf-8'));
      }
    } catch {}
  }
  return {};
}

function writeSessionNames(names: SessionNames): void {
  const dir = dirname(SESSION_NAMES_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  try {
    if (existsSync(SESSION_NAMES_PATH)) {
      writeFileSync(SESSION_NAMES_PATH + '.bak', readFileSync(SESSION_NAMES_PATH), 'utf-8');
    }
  } catch {}
  const tmpPath = SESSION_NAMES_PATH + '.tmp.' + process.pid;
  writeFileSync(tmpPath, JSON.stringify(names, null, 2), 'utf-8');
  renameSync(tmpPath, SESSION_NAMES_PATH);
}

const NOISE_WORDS = new Set([
  'the', 'a', 'an', 'i', 'my', 'we', 'you', 'your', 'this', 'that', 'it',
  'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'should',
  'would', 'will', 'have', 'has', 'had', 'just', 'also', 'need', 'want',
  'please', 'session', 'help', 'work', 'task', 'update', 'new', 'check',
  'make', 'get', 'set', 'put', 'use', 'run', 'try', 'let', 'see', 'look',
  'fix', 'add', 'create', 'build', 'deploy', 'code', 'read', 'write',
  'thing', 'things', 'something', 'going', 'like', 'know', 'think', 'right',
  'whatever', 'current', 'really', 'actually', 'working', 'doing', 'change',
  'what', 'how', 'why', 'when', 'where', 'which', 'who', 'there', 'here',
  'not', 'but', 'and', 'for', 'with', 'from', 'about', 'into', 'been',
  'some', 'all', 'any', 'each', 'every', 'both', 'our', 'they', 'them',
  'those', 'these', 'out', 'off', 'tell', 'show', 'give',
]);

function sanitizePromptForNaming(prompt: string): string {
  return prompt
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, ' ')
    .replace(/<task-notification>[\s\S]*?<\/task-notification>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ' ')
    .replace(/\b[0-9a-f]{7,}\b/gi, ' ')
    .replace(/(?:\/[\w.-]+){2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFallbackName(prompt: string): string | null {
  const words = prompt
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !NOISE_WORDS.has(w.toLowerCase()));

  if (words.length === 0) return null;

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(w);
    }
    if (unique.length >= 4) break;
  }

  const PAD_WORDS = ['Session', 'Work', 'Task', 'Context'];
  while (unique.length < 4) {
    const pad = PAD_WORDS[unique.length - 1] || 'Session';
    unique.push(pad);
  }

  return unique.slice(0, 4)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function storeName(sessionId: string, label: string, source: string): void {
  const locked = acquireLock();
  if (!locked) console.error('[SessionAutoName] Lock timeout -- writing anyway');
  try {
    const names = readSessionNames();
    names[sessionId] = label;
    writeSessionNames(names);
  } finally {
    if (locked) releaseLock();
  }
  const cacheContent = `cached_session_id='${sessionId}'\ncached_session_label='${label}'\n`;
  const cachePath = taiPath('memory', 'state', 'session-name-cache.sh');
  writeFileSync(cachePath, cacheContent, 'utf-8');
  updateSessionNameInWorkJson(sessionId, label);
  console.error(`[SessionAutoName] Named session: "${label}" (${source})`);
}

async function readStdin(timeout: number = 5000): Promise<HookInput | null> {
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      let data = '';
      const timer = setTimeout(() => resolve(data), timeout);
      process.stdin.on('data', (chunk) => { data += chunk.toString(); });
      process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
      process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
    });

    if (!raw.trim()) return null;

    try {
      return JSON.parse(raw) as HookInput;
    } catch {
      const sessionMatch = raw.match(/"session_id"\s*:\s*"([^"]+)"/);
      const promptMatch = raw.match(/"(?:prompt|user_prompt)"\s*:\s*"([\s\S]{0,2000})/);
      if (sessionMatch) {
        return {
          session_id: sessionMatch[1],
          prompt: promptMatch
            ? promptMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\t/g, ' ')
            : undefined,
        };
      }
    }
  } catch (error) {
    console.error('[SessionAutoName] Error reading stdin:', error);
  }
  return null;
}

async function main() {
  const hookInput = await readStdin();

  if (!hookInput?.session_id) {
    console.error('[SessionAutoName] No session_id in stdin -- exiting');
    process.exit(0);
  }

  const sessionId = hookInput.session_id;
  const existingNames = readSessionNames();
  const rawPrompt = hookInput.prompt || hookInput.user_prompt || '';
  const prompt = sanitizePromptForNaming(rawPrompt);

  // First prompt -- generate name
  if (!existingNames[sessionId]) {
    if (!prompt) {
      console.error('[SessionAutoName] No prompt text for new session -- skipping');
      process.exit(0);
    }

    const fallback = extractFallbackName(prompt);
    if (fallback) {
      storeName(sessionId, fallback, 'deterministic');
    }

    upsertSession(sessionId, fallback || '', prompt.slice(0, 120), 'native');
    process.exit(0);
  }

  // Subsequent prompts -- keep session alive in work.json
  upsertSession(sessionId, existingNames[sessionId] || '', '', 'native');

  process.exit(0);
}

main().catch((error) => {
  console.error('[SessionAutoName] Fatal error:', error);
  process.exit(0);
});
