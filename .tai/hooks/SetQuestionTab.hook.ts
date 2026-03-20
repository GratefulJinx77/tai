#!/usr/bin/env bun
/**
 * SetQuestionTab.hook.ts - Tab color for user input (PreToolUse)
 *
 * Changes the terminal tab color to teal when Claude invokes AskUserQuestion.
 * Parses the question's header field to show a short summary.
 *
 * TRIGGER: PreToolUse (matcher: AskUserQuestion)
 */

import { setTabState, readTabState } from './lib/tab-setter';
import { isValidQuestionTitle, getQuestionFallback } from './lib/output-validators';

const FALLBACK_TITLE = getQuestionFallback();

function readStdin(timeoutMs = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function extractSummary(input: any): string {
  try {
    const questions = input?.tool_input?.questions;
    if (!Array.isArray(questions) || questions.length === 0) return FALLBACK_TITLE;

    const q = questions[0];

    if (q.header && typeof q.header === 'string' && q.header.trim().length > 0) {
      return q.header.trim();
    }

    if (q.question && typeof q.question === 'string') {
      const words = q.question.trim().split(/\s+/).slice(0, 3);
      return words.join(' ').replace(/\?$/, '');
    }
  } catch { /* fall through */ }
  return FALLBACK_TITLE;
}

async function main() {
  let summary = FALLBACK_TITLE;
  let sessionId: string | undefined;

  try {
    const raw = await readStdin();
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      summary = extractSummary(parsed);
      sessionId = parsed.session_id;
    }
  } catch { /* stdin parse failed */ }

  if (!isValidQuestionTitle(summary)) summary = FALLBACK_TITLE;

  try {
    const currentState = readTabState(sessionId);
    const previousTitle = currentState?.title || undefined;
    setTabState({ title: summary, state: 'question', previousTitle, sessionId });
    console.error(`[SetQuestionTab] Tab set to teal with summary: "${summary}"`);
  } catch {
    console.error('[SetQuestionTab] Kitty remote control unavailable');
  }

  process.exit(0);
}

main();
