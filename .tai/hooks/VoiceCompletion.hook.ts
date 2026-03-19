#!/usr/bin/env bun
/**
 * VoiceCompletion.hook.ts -- Send completion voice line to TTS server
 *
 * Extracts the voice line from Claude's response and sends it to
 * a configurable TTS endpoint for spoken playback.
 *
 * TRIGGER: Stop
 *
 * VOICE GATE: Only fires for main terminal sessions (not subagents).
 */

import { readHookInput } from './lib/hook-io';
import { isValidVoiceCompletion, getVoiceFallback } from './lib/output-validators';
import { getTeamConfig } from './lib/identity';
import { taiPath } from './lib/paths';
import { readFileSync, existsSync } from 'fs';

function isMainSession(): boolean {
  return !process.env.CLAUDE_CODE_AGENT_TASK_ID;
}

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  if (!isMainSession()) {
    console.error('[VoiceCompletion] Voice OFF (not main session)');
    process.exit(0);
  }

  // Extract voice line from last assistant message
  const lastMessage = input.last_assistant_message || '';
  // Look for voice line markers in the response (e.g., "Voice: ..." or team-configured prefix)
  const voiceMatch = lastMessage.match(/(?:Voice|Summary):\s*(.+?)(?:\n|$)/i);
  const voiceLine = voiceMatch ? voiceMatch[1].trim() : '';

  if (!voiceLine || !isValidVoiceCompletion(voiceLine)) {
    console.error('[VoiceCompletion] No valid voice line found');
    process.exit(0);
  }

  // Read TTS config from team.yaml notifications section
  const team = getTeamConfig();
  let ttsUrl = '';
  let voiceId = '';

  // Check for voice config in team settings or a dedicated config file
  const voiceConfigPath = taiPath('config', 'voice.yaml');
  if (existsSync(voiceConfigPath)) {
    try {
      const content = readFileSync(voiceConfigPath, 'utf-8');
      const urlMatch = content.match(/^tts_url:\s*(.+)$/m);
      const idMatch = content.match(/^voice_id:\s*(.+)$/m);
      if (urlMatch) ttsUrl = urlMatch[1].trim().replace(/^["']|["']$/g, '');
      if (idMatch) voiceId = idMatch[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* skip */ }
  }

  if (!ttsUrl) {
    console.error('[VoiceCompletion] No TTS URL configured');
    process.exit(0);
  }

  try {
    await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: voiceLine,
        voice_id: voiceId || undefined,
        voice_enabled: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    console.error(`[VoiceCompletion] Voice sent: "${voiceLine}"`);
  } catch {
    console.error('[VoiceCompletion] Voice failed (server down or timeout)');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[VoiceCompletion] Fatal:', err);
  process.exit(0);
});
