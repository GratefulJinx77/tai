/**
 * output-validators.ts - Validation for voice and tab title outputs
 *
 * Tab title validators enforce the state machine:
 *   - Working titles: gerund start ("Fixing auth bug.")
 *   - Completion titles: past tense, NO gerund ("Fixed auth bug.")
 *   - Question titles: noun phrase, no period ("Auth method")
 */

const GARBAGE_PATTERNS = [
  /appreciate/i,
  /thank/i,
  /welcome/i,
  /help(ing)? you/i,
  /assist(ing)? you/i,
  /reaching out/i,
  /happy to/i,
  /let me know/i,
  /feel free/i,
];

const CONVERSATIONAL_STARTERS = [
  /^I'm /i, /^I am /i, /^Sure[,.]?/i, /^OK[,.]?/i,
  /^Got it[,.]?/i, /^Done\.?$/i, /^Yes[,.]?/i, /^No[,.]?/i,
  /^Okay[,.]?/i, /^Alright[,.]?/i,
];

const SINGLE_WORD_BLOCKLIST = new Set([
  'ready', 'done', 'ok', 'okay', 'yes', 'no', 'sure',
  'hello', 'hi', 'hey', 'thanks', 'working', 'processing',
]);

export function isValidVoiceCompletion(text: string): boolean {
  if (!text || text.length < 10) return false;
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount === 1) {
    const lower = text.toLowerCase().replace(/[^a-z]/g, '');
    if (SINGLE_WORD_BLOCKLIST.has(lower) || lower.length < 10) return false;
  }
  for (const p of GARBAGE_PATTERNS) if (p.test(text)) return false;
  if (text.length < 40) {
    if (/\bready\b/i.test(text) || /\bhello\b/i.test(text)) return false;
  }
  for (const p of CONVERSATIONAL_STARTERS) if (p.test(text)) return false;
  return true;
}

export function getVoiceFallback(): string {
  return '';
}

// --- Tab Title Validation ---

const INCOMPLETE_ENDINGS = new Set([
  'the', 'a', 'an', 'to', 'for', 'with', 'of',
  'in', 'on', 'at', 'by', 'from', 'into', 'about',
  'and', 'or', 'but', 'that', 'which',
  'now', 'then', 'still', 'also', 'just', 'only', 'even',
  'very', 'quite', 'rather', 'really', 'here', 'there',
]);

function isValidTitleBase(text: string): { valid: boolean; firstWord: string } {
  if (!text || text.length < 5) return { valid: false, firstWord: '' };
  if (!text.endsWith('.')) return { valid: false, firstWord: '' };

  const content = text.slice(0, -1).trim();
  const words = content.split(/\s+/);
  if (words.length < 2 || words.length > 4) return { valid: false, firstWord: '' };

  const firstWord = words[0].toLowerCase();

  if (/^(completed?|proces{1,2}e?d|processing|handled|handling|finished|finishing|worked|working|done|analyzed?) (the |on )?(task|request|work|it|input)$/i.test(content)) {
    return { valid: false, firstWord };
  }

  const lower = content.toLowerCase();
  if (/\bi\b/.test(lower) || /\bme\b/.test(lower) || /\bmy\b/.test(lower)) {
    return { valid: false, firstWord };
  }

  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (INCOMPLETE_ENDINGS.has(lastWord)) return { valid: false, firstWord };
  if (lastWord.length <= 1) return { valid: false, firstWord };
  if (lastWord.endsWith('ly') && lastWord.length > 5) return { valid: false, firstWord };

  return { valid: true, firstWord };
}

export function isValidWorkingTitle(text: string): boolean {
  const { valid, firstWord } = isValidTitleBase(text);
  if (!valid) return false;
  return firstWord.endsWith('ing');
}

export function isValidCompletionTitle(text: string): boolean {
  const { valid, firstWord } = isValidTitleBase(text);
  if (!valid) return false;
  if (firstWord.endsWith('ing')) return false;
  return true;
}

export function isValidQuestionTitle(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.endsWith('.')) return false;
  if (text.length > 30) return false;
  const words = text.trim().split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;
  if (/<[^>]*>/.test(text)) return false;
  return true;
}

// --- Progressive Title Trimming ---

export function trimToValidTitle(
  words: string[],
  validator: (text: string) => boolean,
  maxWords: number = 4
): string | null {
  const limit = Math.min(words.length, maxWords);
  for (let n = limit; n >= 2; n--) {
    let candidate = words.slice(0, n).join(' ').replace(/[,;:!?\-\u2014]+$/, '').trim();
    if (!candidate.endsWith('.')) candidate += '.';
    if (validator(candidate)) return candidate;
  }
  return null;
}

// --- Fallbacks ---

export function getWorkingFallback(): string {
  return 'Analyzing input.';
}

export function getCompletionFallback(): string {
  return 'Task complete.';
}

export function getQuestionFallback(): string {
  return 'Awaiting input';
}

// --- Past Tense Conversion ---

const IRREGULAR_PAST: Record<string, string> = {
  building: 'Built', running: 'Ran', writing: 'Wrote', reading: 'Read',
  making: 'Made', finding: 'Found', getting: 'Got', setting: 'Set',
  doing: 'Did', sending: 'Sent', keeping: 'Kept', putting: 'Put',
  losing: 'Lost', telling: 'Told', understanding: 'Understood',
};

export function gerundToPastTense(gerund: string): string {
  const lower = gerund.toLowerCase();
  if (IRREGULAR_PAST[lower]) return IRREGULAR_PAST[lower];
  if (!lower.endsWith('ing') || lower.length < 5) return gerund;
  const stem = lower.slice(0, -3);
  const result = stem + 'ed';
  return result.charAt(0).toUpperCase() + result.slice(1);
}
