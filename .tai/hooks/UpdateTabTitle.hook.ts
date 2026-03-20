#!/usr/bin/env bun
/**
 * UpdateTabTitle.hook.ts - Tab title on prompt receipt (UserPromptSubmit)
 *
 * TRIGGER: UserPromptSubmit
 *
 * Shows what this session is working on, at a glance, across multiple tabs.
 *
 * FLOW:
 * 1. Extract quick title from prompt (deterministic, instant)
 * 2. Show title on tab
 *
 * Note: PAI version uses inference for better summaries. TAI version uses
 * deterministic extraction only (no inference dependency).
 */

import { isValidWorkingTitle, getWorkingFallback, trimToValidTitle } from './lib/output-validators';
import { setTabState, getSessionOneWord } from './lib/tab-setter';

interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
}

async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

const GERUND_MAP: Record<string, string> = {
  fix: 'Fixing', update: 'Updating', add: 'Adding', remove: 'Removing',
  delete: 'Deleting', check: 'Checking', create: 'Creating', build: 'Building',
  deploy: 'Deploying', debug: 'Debugging', test: 'Testing', review: 'Reviewing',
  refactor: 'Refactoring', implement: 'Implementing', write: 'Writing',
  read: 'Reading', find: 'Finding', search: 'Searching', install: 'Installing',
  configure: 'Configuring', run: 'Running', start: 'Starting', stop: 'Stopping',
  restart: 'Restarting', open: 'Opening', close: 'Closing', move: 'Moving',
  rename: 'Renaming', merge: 'Merging', revert: 'Reverting', clean: 'Cleaning',
  show: 'Showing', list: 'Listing', get: 'Getting', set: 'Setting',
  make: 'Making', change: 'Changing', modify: 'Modifying', adjust: 'Adjusting',
  improve: 'Improving', optimize: 'Optimizing', analyze: 'Analyzing',
  research: 'Researching', investigate: 'Investigating', explain: 'Explaining',
  push: 'Pushing', pull: 'Pulling', commit: 'Committing', design: 'Designing',
};

const FALSE_GERUNDS = new Set([
  'something', 'nothing', 'anything', 'everything',
  'morning', 'evening', 'string', 'king', 'ring', 'thing',
  'bring', 'spring', 'swing', 'wing', 'cling', 'fling', 'sting',
  'during', 'using', 'being', 'ceiling', 'feeling',
]);

function extractPromptTitle(prompt: string): string | null {
  const text = prompt.trim().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 200);
  const words = text.split(' ').filter(w => w.length > 1);
  if (words.length === 0) return null;

  const firstLower = words[0].toLowerCase().replace(/[^a-z]/g, '');

  if (firstLower.endsWith('ing') && firstLower.length > 4 && !FALSE_GERUNDS.has(firstLower)) {
    return trimToValidTitle(words, isValidWorkingTitle);
  }

  const gerund = GERUND_MAP[firstLower];
  if (gerund) {
    const rest = words.slice(1, 3).join(' ');
    const result = rest ? `${gerund} ${rest}` : gerund;
    return result.endsWith('.') ? result : result + '.';
  }

  return null;
}

async function main() {
  try {
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    const prompt = data.prompt || '';

    if (!prompt || prompt.length < 3) process.exit(0);

    // Skip ratings (1-10)
    if (/^([1-9]|10)$/.test(prompt.trim())) process.exit(0);

    // Session label
    const sessionLabel = data.session_id ? getSessionOneWord(data.session_id) : null;
    const prefix = sessionLabel ? `${sessionLabel} | ` : '';

    // Extract deterministic title
    const quickTitle = extractPromptTitle(prompt);
    const finalTitle = quickTitle || getWorkingFallback();

    setTabState({ title: `${prefix}${finalTitle}`, state: 'working', sessionId: data.session_id });
    console.error(`[UpdateTabTitle] "${finalTitle}"`);
    process.exit(0);
  } catch (err) {
    console.error(`[UpdateTabTitle] Error: ${err}`);
    process.exit(0);
  }
}

main();
