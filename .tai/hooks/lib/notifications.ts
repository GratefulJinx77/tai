/**
 * notifications.ts -- Session timing + ntfy push notifications
 *
 * Session timing is used by LoadContext.hook.ts to record session start.
 * ntfy push is available for hooks that need mobile/desktop notifications.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { taiPath } from './paths';

// ============================================================================
// Session Timing
// ============================================================================

const SESSION_START_FILE = '/tmp/tai-session-start.txt';

export function recordSessionStart(): void {
  try { writeFileSync(SESSION_START_FILE, Date.now().toString()); } catch {}
}

export function getSessionDurationMinutes(): number {
  try {
    if (existsSync(SESSION_START_FILE)) {
      const startTime = parseInt(readFileSync(SESSION_START_FILE, 'utf-8'));
      return (Date.now() - startTime) / 1000 / 60;
    }
  } catch {}
  return 0;
}

// ============================================================================
// ntfy Push (fire-and-forget)
// ============================================================================

export type NotificationPriority = 'min' | 'low' | 'default' | 'high' | 'urgent';

export interface NotificationOptions {
  title?: string;
  priority?: NotificationPriority;
  tags?: string[];
}

function loadNtfyConfig(): { enabled: boolean; topic: string; server: string } {
  try {
    const configPath = taiPath('config', 'team.yaml');
    if (!existsSync(configPath)) return { enabled: false, topic: '', server: 'ntfy.sh' };

    const raw = readFileSync(configPath, 'utf-8');
    // Simple extraction from team.yaml notifications section
    const enabledMatch = raw.match(/ntfy_enabled:\s*(true|false)/);
    const topicMatch = raw.match(/ntfy_topic:\s*(.+)/);
    const serverMatch = raw.match(/ntfy_server:\s*(.+)/);

    return {
      enabled: enabledMatch?.[1] === 'true',
      topic: topicMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '',
      server: serverMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? 'ntfy.sh',
    };
  } catch {
    return { enabled: false, topic: '', server: 'ntfy.sh' };
  }
}

export async function sendPush(
  message: string,
  options: NotificationOptions = {}
): Promise<boolean> {
  const config = loadNtfyConfig();
  if (!config.enabled || !config.topic) return false;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
    if (options.title) headers['Title'] = options.title;
    if (options.priority) {
      const map: Record<NotificationPriority, string> = {
        min: '1', low: '2', default: '3', high: '4', urgent: '5',
      };
      headers['Priority'] = map[options.priority] || '3';
    }
    if (options.tags?.length) headers['Tags'] = options.tags.join(',');

    const response = await fetch(`https://${config.server}/${config.topic}`, {
      method: 'POST',
      headers,
      body: message,
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
