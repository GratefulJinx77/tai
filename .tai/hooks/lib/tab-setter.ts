/**
 * tab-setter.ts - Unified tab state setter for TAI.
 *
 * Single function that:
 * 1. Sets Kitty tab title and color via remote control
 * 2. Persists per-window state for daemon recovery
 *
 * All hooks call setTabState() instead of directly running kitten commands.
 */

import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { TAB_COLORS, PHASE_TAB_CONFIG, ACTIVE_TAB_BG, ACTIVE_TAB_FG, INACTIVE_TAB_FG, type TabState, type AlgorithmTabPhase } from './tab-constants';
import { taiPath } from './paths';

const TAB_TITLES_DIR = taiPath('memory', 'state', 'tab-titles');
const KITTY_SESSIONS_DIR = taiPath('memory', 'state', 'kitty-sessions');

/**
 * Get Kitty environment from env vars or persisted per-session file.
 */
function getKittyEnv(sessionId?: string): { listenOn: string | null; windowId: string | null } {
  let listenOn = process.env.KITTY_LISTEN_ON || null;
  let windowId = process.env.KITTY_WINDOW_ID || null;
  if (listenOn && windowId) return { listenOn, windowId };

  if (sessionId) {
    try {
      const sessionPath = join(KITTY_SESSIONS_DIR, `${sessionId}.json`);
      if (existsSync(sessionPath)) {
        const entry = JSON.parse(readFileSync(sessionPath, 'utf-8'));
        listenOn = listenOn || entry.listenOn || null;
        windowId = windowId || entry.windowId || null;
        if (listenOn && windowId) return { listenOn, windowId };
      }
    } catch { /* silent */ }
  }

  if (!listenOn) {
    const defaultSocket = `/tmp/kitty-${process.env.USER}`;
    try {
      if (existsSync(defaultSocket)) {
        listenOn = `unix:${defaultSocket}`;
      }
    } catch { /* silent */ }
  }

  return { listenOn, windowId };
}

/**
 * Persist a session's Kitty environment for later hook lookups.
 */
export function persistKittySession(sessionId: string, listenOn: string, windowId: string): void {
  try {
    if (!existsSync(KITTY_SESSIONS_DIR)) mkdirSync(KITTY_SESSIONS_DIR, { recursive: true });
    writeFileSync(
      join(KITTY_SESSIONS_DIR, `${sessionId}.json`),
      JSON.stringify({ listenOn, windowId }),
      'utf-8'
    );
  } catch { /* silent */ }
}

/**
 * Remove a session's persisted Kitty environment file.
 */
export function cleanupKittySession(sessionId: string): void {
  try {
    const sessionPath = join(KITTY_SESSIONS_DIR, `${sessionId}.json`);
    if (existsSync(sessionPath)) unlinkSync(sessionPath);
  } catch { /* silent */ }
}

interface SetTabOptions {
  title: string;
  state: TabState;
  previousTitle?: string;
  sessionId?: string;
}

/**
 * Clean up state files for kitty windows that no longer exist.
 */
function cleanupStaleStateFiles(): void {
  try {
    if (!existsSync(TAB_TITLES_DIR)) return;
    const files = readdirSync(TAB_TITLES_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return;

    const defaultSocket = `/tmp/kitty-${process.env.USER}`;
    const socketPath = process.env.KITTY_LISTEN_ON || (existsSync(defaultSocket) ? `unix:${defaultSocket}` : null);
    if (!socketPath) return;
    const liveOutput = execSync(`kitten @ --to="${socketPath}" ls 2>/dev/null | jq -r ".[].tabs[].windows[].id" 2>/dev/null`, {
      encoding: 'utf-8', timeout: 2000,
    }).trim();
    if (!liveOutput) return;

    const liveIds = new Set(liveOutput.split('\n').map(id => id.trim()));

    for (const file of files) {
      const winId = file.replace('.json', '');
      if (!liveIds.has(winId)) {
        try { unlinkSync(join(TAB_TITLES_DIR, file)); } catch { /* silent */ }
      }
    }
  } catch { /* silent -- cleanup is best-effort */ }
}

export function setTabState(opts: SetTabOptions): void {
  const { title, state, previousTitle, sessionId } = opts;
  const colors = TAB_COLORS[state];
  const kittyEnv = getKittyEnv(sessionId);

  try {
    const isKitty = process.env.TERM === 'xterm-kitty' || kittyEnv.listenOn;
    if (!isKitty) return;

    if (!kittyEnv.listenOn) {
      console.error(`[tab-setter] No kitty socket available, skipping tab update`);
      return;
    }

    const escaped = title.replace(/"/g, '\\"');
    const toFlag = `--to="${kittyEnv.listenOn}"`;
    execSync(`kitten @ ${toFlag} set-tab-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });
    execSync(`kitten @ ${toFlag} set-window-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });

    if (state === 'idle') {
      execSync(
        `kitten @ ${toFlag} set-tab-color --self active_bg=none active_fg=none inactive_bg=none inactive_fg=none`,
        { stdio: 'ignore', timeout: 2000 }
      );
    } else {
      execSync(
        `kitten @ ${toFlag} set-tab-color --self active_bg=${ACTIVE_TAB_BG} active_fg=${ACTIVE_TAB_FG} inactive_bg=${colors.inactiveBg} inactive_fg=${INACTIVE_TAB_FG}`,
        { stdio: 'ignore', timeout: 2000 }
      );
    }
  } catch (err) {
    console.error(`[tab-setter] Error setting tab:`, err);
  }

  const windowId = kittyEnv.windowId;
  if (!windowId) return;

  try {
    if (state === 'idle') {
      const statePath = join(TAB_TITLES_DIR, `${windowId}.json`);
      if (existsSync(statePath)) unlinkSync(statePath);
    } else {
      if (!existsSync(TAB_TITLES_DIR)) mkdirSync(TAB_TITLES_DIR, { recursive: true });
      const stateData: Record<string, unknown> = {
        title,
        inactiveBg: colors.inactiveBg,
        state,
        timestamp: new Date().toISOString(),
      };
      if (previousTitle) stateData.previousTitle = previousTitle;
      writeFileSync(join(TAB_TITLES_DIR, `${windowId}.json`), JSON.stringify(stateData), 'utf-8');
    }
  } catch { /* silent */ }

  cleanupStaleStateFiles();
}

/**
 * Read per-window state file. Returns null if not found or invalid.
 */
export function readTabState(sessionId?: string): { title: string; state: TabState; previousTitle?: string; phase?: string } | null {
  const kittyEnv = getKittyEnv(sessionId);
  const windowId = kittyEnv.windowId;
  if (!windowId) return null;
  try {
    const statePath = join(TAB_TITLES_DIR, `${windowId}.json`);
    if (!existsSync(statePath)) return null;
    const raw = JSON.parse(readFileSync(statePath, 'utf-8'));
    return {
      title: raw.title || '',
      state: raw.state || 'idle',
      previousTitle: raw.previousTitle,
      phase: raw.phase,
    };
  } catch { return null; }
}

/**
 * Strip emoji prefix from a tab title to get raw text.
 */
export function stripPrefix(title: string): string {
  return title.replace(/^(?:🧠|⚙️|⚙|✓|❓|👁️|📋|🔨|⚡|✅|📚)\s*/, '').trim();
}

/**
 * Extract up to 4 representative words from a session name.
 */
export function getSessionOneWord(sessionId: string): string | null {
  try {
    const namesPath = taiPath('memory', 'state', 'session-names.json');
    if (!existsSync(namesPath)) return null;
    const names = JSON.parse(readFileSync(namesPath, 'utf-8'));
    const fullName = names[sessionId];
    if (!fullName) return null;

    const SESSION_NOISE = new Set([
      'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'of', 'with',
      'my', 'our', 'new', 'old', 'fix', 'add', 'update', 'set', 'get',
    ]);

    const words = fullName.split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length === 0) return null;

    const meaningful = words.filter((w: string) => !SESSION_NOISE.has(w.toLowerCase()));
    if (meaningful.length >= 2) {
      return meaningful.slice(0, 4).join(' ').toUpperCase();
    } else if (meaningful.length === 1) {
      const idx = words.indexOf(meaningful[0]);
      const nearby = words.slice(Math.max(0, idx - 1), idx + 3).filter((w: string) => w.length > 0);
      return nearby.slice(0, 4).join(' ').toUpperCase();
    }
    return words.slice(0, 4).join(' ').toUpperCase();
  } catch {
    return null;
  }
}

/**
 * Set tab title and color for an Algorithm phase.
 */
export function setPhaseTab(phase: AlgorithmTabPhase, sessionId: string, summary?: string): void {
  const config = PHASE_TAB_CONFIG[phase];
  if (!config) return;

  const oneWord = getSessionOneWord(sessionId) || 'WORKING';
  const kittyEnv = getKittyEnv(sessionId);

  let title: string;
  if (phase === 'COMPLETE' && summary) {
    title = `✅ ${summary}`;
  } else if (phase === 'COMPLETE') {
    title = `✅ ${oneWord}`;
  } else if (phase === 'IDLE') {
    title = oneWord;
  } else {
    let existingDesc = '';
    const currentState = readTabState(sessionId);
    if (currentState?.title) {
      const pipeIdx = currentState.title.indexOf('|');
      if (pipeIdx !== -1) existingDesc = currentState.title.slice(pipeIdx + 1).trim();
    }
    const desc = existingDesc || config.gerund;
    title = `${config.symbol} ${oneWord} | ${desc}`;
  }

  try {
    const isKitty = process.env.TERM === 'xterm-kitty' || kittyEnv.listenOn;
    if (!isKitty) return;

    if (!kittyEnv.listenOn) {
      console.error(`[tab-setter] No kitty socket available, skipping phase tab update`);
      return;
    }

    const escaped = title.replace(/"/g, '\\"');
    const toFlag = `--to="${kittyEnv.listenOn}"`;

    execSync(`kitten @ ${toFlag} set-tab-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });
    execSync(`kitten @ ${toFlag} set-window-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });

    if (phase === 'IDLE') {
      execSync(
        `kitten @ ${toFlag} set-tab-color --self active_bg=none active_fg=none inactive_bg=none inactive_fg=none`,
        { stdio: 'ignore', timeout: 2000 }
      );
    } else {
      execSync(
        `kitten @ ${toFlag} set-tab-color --self active_bg=${ACTIVE_TAB_BG} active_fg=${ACTIVE_TAB_FG} inactive_bg=${config.inactiveBg} inactive_fg=${INACTIVE_TAB_FG}`,
        { stdio: 'ignore', timeout: 2000 }
      );
    }
  } catch (err) {
    console.error(`[tab-setter] Error setting phase tab:`, err);
  }

  const windowId = kittyEnv.windowId;
  if (!windowId) return;

  try {
    if (!existsSync(TAB_TITLES_DIR)) mkdirSync(TAB_TITLES_DIR, { recursive: true });
    writeFileSync(join(TAB_TITLES_DIR, `${windowId}.json`), JSON.stringify({
      title,
      inactiveBg: config.inactiveBg,
      state: phase === 'COMPLETE' ? 'completed' : 'working',
      phase,
      timestamp: new Date().toISOString(),
    }), 'utf-8');
  } catch { /* silent */ }
}
