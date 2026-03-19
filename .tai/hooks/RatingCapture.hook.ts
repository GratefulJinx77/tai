#!/usr/bin/env bun
/**
 * RatingCapture.hook.ts - Unified rating & sentiment capture (UserPromptSubmit)
 *
 * Handles both explicit ratings (1-10 pattern) and implicit sentiment detection.
 *
 * TRIGGER: UserPromptSubmit
 *
 * Note: PAI version uses inference for implicit sentiment analysis.
 * TAI version handles explicit ratings only (no inference dependency).
 * Implicit sentiment can be added by configuring an inference endpoint.
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getLearningCategory } from './lib/learning-utils';
import { getISOTimestamp, getTimestampComponents } from './lib/time';
import { taiPath } from './lib/paths';

interface HookInput {
  session_id: string;
  prompt?: string;
  user_prompt?: string;
  transcript_path: string;
  hook_event_name: string;
}

interface RatingEntry {
  timestamp: string;
  rating: number;
  session_id: string;
  comment?: string;
  source?: 'implicit' | 'explicit';
  sentiment_summary?: string;
  confidence?: number;
  response_preview?: string;
}

const SIGNALS_DIR = taiPath('memory', 'learnings', 'signals');
const RATINGS_FILE = join(SIGNALS_DIR, 'ratings.jsonl');
const LAST_RESPONSE_CACHE = taiPath('memory', 'state', 'last-response.txt');

function getLastResponse(): string {
  try {
    if (existsSync(LAST_RESPONSE_CACHE)) return readFileSync(LAST_RESPONSE_CACHE, 'utf-8');
  } catch {}
  return '';
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

/**
 * Parse explicit rating pattern from prompt.
 * Matches: "7", "8 - good work", "6: needs work", "9 excellent", "10!"
 * Rejects: "3 items", "5 things to fix", "7th thing"
 */
function parseExplicitRating(prompt: string): { rating: number; comment?: string } | null {
  const trimmed = prompt.trim();
  const ratingPattern = /^(10|[1-9])(?:\s*[-:]\s*|\s+)?(.*)$/;
  const match = trimmed.match(ratingPattern);
  if (!match) return null;

  const rating = parseInt(match[1], 10);
  const rest = match[2]?.trim() || undefined;

  if (rating < 1 || rating > 10) return null;

  const afterNumber = trimmed.slice(match[1].length);
  if (afterNumber.length > 0 && /^[/.\dA-Za-z]/.test(afterNumber)) return null;

  if (rest) {
    const sentenceStarters = /^(items?|things?|steps?|files?|lines?|bugs?|issues?|errors?|times?|minutes?|hours?|days?|seconds?|percent|%|th\b|st\b|nd\b|rd\b|of\b|in\b|at\b|to\b|the\b|a\b|an\b)/i;
    if (sentenceStarters.test(rest)) return null;
  }

  return { rating, comment: rest };
}

function writeRating(entry: RatingEntry): void {
  if (!existsSync(SIGNALS_DIR)) mkdirSync(SIGNALS_DIR, { recursive: true });
  appendFileSync(RATINGS_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  console.error(`[RatingCapture] Wrote ${entry.source} rating ${entry.rating}`);
}

function captureLowRatingLearning(
  rating: number,
  summaryOrComment: string,
  detailedContext: string,
  source: 'explicit' | 'implicit'
): void {
  if (rating >= 5) return;
  if (!detailedContext?.trim()) return;

  const { year, month, day, hours, minutes, seconds } = getTimestampComponents();
  const yearMonth = `${year}-${month}`;
  const category = getLearningCategory(detailedContext, summaryOrComment);
  const learningsDir = taiPath('memory', 'learnings', category, yearMonth);

  if (!existsSync(learningsDir)) mkdirSync(learningsDir, { recursive: true });

  const label = source === 'explicit' ? `low-rating-${rating}` : `sentiment-rating-${rating}`;
  const filename = `${year}-${month}-${day}-${hours}${minutes}${seconds}_LEARNING_${label}.md`;
  const filepath = join(learningsDir, filename);

  const content = `---
capture_type: LEARNING
timestamp: ${year}-${month}-${day} ${hours}:${minutes}:${seconds}
rating: ${rating}
source: ${source}
auto_captured: true
---

# ${source === 'explicit' ? 'Low Rating' : 'Implicit Low Rating'} Captured: ${rating}/10

**Date:** ${year}-${month}-${day}
**Rating:** ${rating}/10
**Detection Method:** ${source === 'explicit' ? 'Explicit Rating' : 'Sentiment Analysis'}
${summaryOrComment ? `**Feedback:** ${summaryOrComment}` : ''}

---

## Context

${detailedContext || 'No context available'}

---

## Improvement Notes

This response was rated ${rating}/10. Use this as an improvement opportunity.

---
`;

  writeFileSync(filepath, content, 'utf-8');
  console.error(`[RatingCapture] Captured low ${source} rating learning`);
}

async function main() {
  try {
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    const prompt = data.prompt || data.user_prompt || '';

    // Path 1: Explicit Rating
    const explicitResult = parseExplicitRating(prompt);
    if (explicitResult) {
      const cachedResponse = getLastResponse();
      const entry: RatingEntry = {
        timestamp: getISOTimestamp(),
        rating: explicitResult.rating,
        session_id: data.session_id,
        source: 'explicit',
      };
      if (explicitResult.comment) entry.comment = explicitResult.comment;
      if (cachedResponse) entry.response_preview = cachedResponse.slice(0, 500);

      writeRating(entry);

      if (explicitResult.rating < 5) {
        const responseContext = getLastResponse();
        captureLowRatingLearning(explicitResult.rating, explicitResult.comment || '', responseContext, 'explicit');
      }

      process.exit(0);
    }

    // Path 2: Implicit sentiment -- skip for now (requires inference endpoint)
    // Teams can configure inference by adding an inference module

    process.exit(0);
  } catch (err) {
    console.error(`[RatingCapture] Error: ${err}`);
    process.exit(0);
  }
}

main();
