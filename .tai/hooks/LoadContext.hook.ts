#!/usr/bin/env bun
/**
 * LoadContext.hook.ts - Inject TAI dynamic context into Claude's context (SessionStart)
 *
 * Injects DYNAMIC context only:
 * - Learning readback (signals, wisdom, failure patterns)
 * - Active work summary (last 48h sessions + tracked projects)
 * - Team context (loaded from team.yaml)
 *
 * TRIGGER: SessionStart
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getTaiDir, taiPath } from './lib/paths';
import { recordSessionStart } from './lib/notifications';
import { loadLearningDigest, loadWisdomFrames, loadFailurePatterns, loadSignalTrends } from './lib/learning-readback';

interface DynamicContextConfig {
  learningReadback?: boolean;
  activeWorkSummary?: boolean;
}

interface WorkSession {
  type: 'recent' | 'project';
  name: string;
  title: string;
  status: string;
  timestamp: string;
  stale: boolean;
  objectives?: string[];
  handoff_notes?: string;
  next_steps?: string[];
  prd?: { id: string; status: string; progress: string } | null;
}

/**
 * Scan recent memory/work/ directories (last 48h) for active sessions.
 */
function getRecentWorkSessions(): WorkSession[] {
  const taiDir = getTaiDir();
  const workDir = taiPath('memory', 'work');
  if (!existsSync(workDir)) return [];

  let sessionNames: Record<string, string> = {};
  const namesPath = taiPath('memory', 'state', 'session-names.json');
  try {
    if (existsSync(namesPath)) {
      sessionNames = JSON.parse(readFileSync(namesPath, 'utf-8'));
    }
  } catch { /* ignore parse errors */ }

  const sessions: WorkSession[] = [];
  const now = Date.now();
  const cutoff48h = 48 * 60 * 60 * 1000;
  const seenSessionIds = new Set<string>();

  try {
    const allDirs = readdirSync(workDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{8}-\d{6}_/.test(d.name))
      .map(d => d.name)
      .sort()
      .reverse()
      .slice(0, 30);

    for (const dirName of allDirs) {
      const match = dirName.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})_(.+)$/);
      if (!match) continue;

      const [, y, mo, d, h, mi, s, slug] = match;
      const dirTime = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`).getTime();

      if (now - dirTime > cutoff48h) break;

      const dirPath = join(workDir, dirName);
      const prdPath = join(dirPath, 'PRD.md');
      if (!existsSync(prdPath)) continue;

      let status = 'UNKNOWN';
      let rawTitle = slug.replace(/-/g, ' ');
      let sessionId: string | undefined;

      try {
        const prdHead = readFileSync(prdPath, 'utf-8').substring(0, 600);
        const statusMatch = prdHead.match(/^status:\s*"?(\w+)"?/m);
        const titleMatch = prdHead.match(/^title:\s*"?(.+?)"?\s*$/m);
        const sessionIdMatch = prdHead.match(/^session_id:\s*"?(.+?)"?\s*$/m);
        if (statusMatch) status = statusMatch[1];
        if (titleMatch) rawTitle = titleMatch[1];
        if (sessionIdMatch) sessionId = sessionIdMatch[1]?.trim();
      } catch { /* skip */ }

      try {
        if (status === 'COMPLETED') continue;
        if (rawTitle.length < 10) continue;
        if (sessionId && seenSessionIds.has(sessionId)) continue;
        if (sessionId) seenSessionIds.add(sessionId);

        const title = (sessionId && sessionNames[sessionId]) || rawTitle;

        if (sessions.length >= 8) break;

        let prd: WorkSession['prd'] = null;
        try {
          const prdContent = readFileSync(prdPath, 'utf-8');
          const prdIdMatch = prdContent.match(/^id:\s*(.+)$/m);
          const prdStatusMatch = prdContent.match(/^status:\s*(.+)$/m);
          const prdVerifyMatch = prdContent.match(/^verification_summary:\s*"?(.+?)"?$/m);
          prd = {
            id: prdIdMatch?.[1]?.trim() || 'PRD',
            status: prdStatusMatch?.[1]?.trim() || 'UNKNOWN',
            progress: prdVerifyMatch?.[1]?.trim() || '0/0'
          };
        } catch { /* no PRDs */ }

        sessions.push({
          type: 'recent',
          name: dirName,
          title: title.length > 60 ? title.substring(0, 57) + '...' : title,
          status,
          timestamp: `${y}-${mo}-${d} ${h}:${mi}`,
          stale: false,
          prd
        });
      } catch { /* skip malformed */ }
    }
  } catch (err) {
    console.error(`[LoadContext] Error scanning work dirs: ${err}`);
  }

  return sessions;
}

/**
 * Load persistent project progress files, flagging stale ones (>14 days).
 */
function getProjectProgress(): WorkSession[] {
  const progressDir = taiPath('memory', 'state', 'progress');
  if (!existsSync(progressDir)) return [];

  const sessions: WorkSession[] = [];
  const now = Date.now();
  const staleThreshold = 14 * 24 * 60 * 60 * 1000;

  try {
    const files = readdirSync(progressDir).filter(f => f.endsWith('-progress.json'));

    for (const file of files) {
      try {
        const content = readFileSync(join(progressDir, file), 'utf-8');
        const progress = JSON.parse(content);
        if (progress.status !== 'active') continue;

        const updatedTime = new Date(progress.updated).getTime();
        const isStale = (now - updatedTime) > staleThreshold;

        sessions.push({
          type: 'project',
          name: progress.project,
          title: progress.project,
          status: 'active',
          timestamp: new Date(progress.updated).toISOString().split('T')[0],
          stale: isStale,
          objectives: progress.objectives,
          handoff_notes: progress.handoff_notes,
          next_steps: progress.next_steps
        });
      } catch { /* skip malformed */ }
    }
  } catch (err) {
    console.error(`[LoadContext] Error reading progress files: ${err}`);
  }

  return sessions;
}

/**
 * Unified activity dashboard -- merges recent work sessions + persistent projects.
 */
function checkActiveProgress(): string | null {
  const recentSessions = getRecentWorkSessions();
  const projects = getProjectProgress();

  if (recentSessions.length === 0 && projects.length === 0) {
    return null;
  }

  let summary = '\nACTIVE WORK:\n';

  if (recentSessions.length > 0) {
    summary += '\n  -- Recent Sessions (last 48h) --\n';
    for (const s of recentSessions) {
      summary += `\n  ${s.title}\n`;
      summary += `     ${s.timestamp} | Status: ${s.status}\n`;
      if (s.prd) {
        summary += `     PRD: ${s.prd.id} (${s.prd.status}, ${s.prd.progress})\n`;
      }
    }
  }

  if (projects.length > 0) {
    summary += '\n  -- Tracked Projects --\n';
    for (const proj of projects) {
      const staleTag = proj.stale ? ' STALE (>14d)' : '';
      summary += `\n  ${proj.name}${staleTag}\n`;

      if (proj.objectives && proj.objectives.length > 0) {
        summary += '     Objectives:\n';
        proj.objectives.forEach(o => summary += `     - ${o}\n`);
      }

      if (proj.handoff_notes) {
        summary += `     Handoff: ${proj.handoff_notes}\n`;
      }

      if (proj.next_steps && proj.next_steps.length > 0) {
        summary += '     Next steps:\n';
        proj.next_steps.forEach(s => summary += `     -> ${s}\n`);
      }
    }
  }

  return summary;
}

async function main() {
  try {
    // Subagents don't need dynamic context injection
    const isSubagent = process.env.CLAUDE_AGENT_TYPE !== undefined;
    if (isSubagent) {
      console.error('[LoadContext] Subagent session - skipping context loading');
      process.exit(0);
    }

    const taiDir = getTaiDir();

    // Record session start time for notification timing
    recordSessionStart();
    console.error('[LoadContext] Session start time recorded');

    // Accumulate all context parts for single systemMessage emission
    const contextParts: string[] = [];

    // Load learning readback context
    const learningDigest = loadLearningDigest(taiDir);
    const wisdomFrames = loadWisdomFrames(taiDir);
    const failurePatterns = loadFailurePatterns(taiDir);
    const signalTrends = loadSignalTrends(taiDir);

    const learningParts: string[] = [];
    if (signalTrends) learningParts.push(signalTrends);
    if (wisdomFrames) learningParts.push(wisdomFrames);
    if (learningDigest) learningParts.push(learningDigest);
    if (failurePatterns) learningParts.push(failurePatterns);

    if (learningParts.length > 0) {
      const learningContext = '\n## Learning Context (auto-loaded)\n\n' + learningParts.join('\n\n');
      contextParts.push(learningContext);
      console.error(`[LoadContext] Loaded learning context: ${learningParts.length} sections`);
    }

    // Active work summary
    const activeProgress = checkActiveProgress();
    if (activeProgress) {
      contextParts.push(activeProgress);
      console.error(`[LoadContext] Active work summary loaded`);
    }

    // Inject memory file age labels for staleness reasoning
    const memoryFiles = [
      { path: taiPath('memory', 'state', 'work.json'), label: 'work.json' },
      { path: taiPath('memory', 'state', 'current-work.json'), label: 'current-work.json' },
    ];
    const ageLabels: string[] = [];
    const now = Date.now();
    for (const mf of memoryFiles) {
      if (existsSync(mf.path)) {
        try {
          const mtime = statSync(mf.path).mtimeMs;
          const ageMs = now - mtime;
          const ageLabel = ageMs < 86400000
            ? (ageMs < 3600000 ? `${Math.floor(ageMs / 60000)}m ago` : `${Math.floor(ageMs / 3600000)}h ago`)
            : `${Math.floor(ageMs / 86400000)}d ago`;
          ageLabels.push(`${mf.label}: ${ageLabel}`);
        } catch { /* skip */ }
      }
    }
    if (ageLabels.length > 0) {
      contextParts.push(`[Memory freshness: ${ageLabels.join(' | ')}]`);
    }

    // Emit all context via systemMessage
    if (contextParts.length > 0) {
      const fullContext = contextParts.join('\n\n---\n\n');
      const output = {
        systemMessage: fullContext
      };
      console.log(JSON.stringify(output));
      console.error(`[LoadContext] Emitted systemMessage (${fullContext.length} chars, ${contextParts.length} sections)`);
    }

    console.error('[LoadContext] TAI session initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('[LoadContext] Error:', error);
    process.exit(0);
  }
}

main();
