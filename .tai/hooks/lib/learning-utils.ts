/**
 * Shared Learning Utilities
 *
 * Categorization logic for learnings across the TAI hook system.
 * Used by: RatingCapture, WorkCompletionLearning
 */

/**
 * Categorize learning as SYSTEM (tooling/infrastructure) or ALGORITHM (task execution)
 */
export function getLearningCategory(content: string, comment?: string): 'SYSTEM' | 'ALGORITHM' {
  const text = `${content} ${comment || ''}`.toLowerCase();

  const algorithmIndicators = [
    /over.?engineer/,
    /wrong approach/,
    /should have asked/,
    /didn't follow/,
    /missed the point/,
    /too complex/,
    /didn't understand/,
    /wrong direction/,
    /not what i wanted/,
    /approach|method|strategy|reasoning/
  ];

  const systemIndicators = [
    /hook|crash|broken/,
    /tool|config|deploy|path/,
    /import|module|file.*not.*found/,
    /typescript|javascript|npm|bun/
  ];

  for (const pattern of algorithmIndicators) {
    if (pattern.test(text)) return 'ALGORITHM';
  }

  for (const pattern of systemIndicators) {
    if (pattern.test(text)) return 'SYSTEM';
  }

  return 'ALGORITHM';
}

/**
 * Determine if a response represents a learning moment
 */
export function isLearningCapture(text: string, summary?: string, analysis?: string): boolean {
  const learningIndicators = [
    /problem|issue|bug|error|failed|broken/i,
    /fixed|solved|resolved|discovered|realized|learned/i,
    /troubleshoot|debug|investigate|root cause/i,
    /lesson|takeaway|now we know|next time/i,
  ];

  const checkText = `${summary || ''} ${analysis || ''} ${text}`;

  let indicatorCount = 0;
  for (const pattern of learningIndicators) {
    if (pattern.test(checkText)) {
      indicatorCount++;
    }
  }

  return indicatorCount >= 2;
}
