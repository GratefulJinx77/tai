#!/usr/bin/env bun
/**
 * TAIUpdateCounts.hook.ts - TAI-specific system metrics (SessionEnd)
 *
 * Collects TAI-specific metrics: team member count, boundary violations,
 * hook execution stats. Supplements the generic UpdateCounts hook with
 * TAI-specific data.
 *
 * TRIGGER: SessionEnd
 * TAI-SPECIFIC: Yes
 */

import { taiPath } from './lib/paths';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { getTeamConfig } from './lib/identity';

function countBoundaryViolations(): number {
  const logPath = taiPath('telemetry', 'boundaries.jsonl');
  if (!existsSync(logPath)) return 0;
  try {
    return readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

function countSecurityEvents(): number {
  const secDir = taiPath('telemetry', 'security');
  if (!existsSync(secDir)) return 0;
  try {
    let count = 0;
    const years = readdirSync(secDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const year of years) {
      const yearPath = join(secDir, year.name);
      const months = readdirSync(yearPath, { withFileTypes: true }).filter(d => d.isDirectory());
      for (const month of months) {
        const monthPath = join(yearPath, month.name);
        count += readdirSync(monthPath).filter(f => f.endsWith('.jsonl')).length;
      }
    }
    return count;
  } catch { return 0; }
}

function countSessions(): number {
  const sessionsPath = taiPath('telemetry', 'sessions.jsonl');
  if (!existsSync(sessionsPath)) return 0;
  try {
    return readFileSync(sessionsPath, 'utf-8').trim().split('\n').filter(Boolean).length;
  } catch { return 0; }
}

async function main() {
  try {
    const team = getTeamConfig();

    const taiMetrics = {
      timestamp: new Date().toISOString(),
      team_name: team.name,
      team_members: team.members.length,
      boundary_violations: countBoundaryViolations(),
      security_events: countSecurityEvents(),
      total_sessions: countSessions(),
    };

    const stateDir = taiPath('memory', 'state');
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

    writeFileSync(
      join(stateDir, 'tai-metrics.json'),
      JSON.stringify(taiMetrics, null, 2),
      'utf-8'
    );

    console.error(`[TAIUpdateCounts] Team: ${team.name} (${team.members.length} members), Boundary violations: ${taiMetrics.boundary_violations}, Security events: ${taiMetrics.security_events}`);
  } catch (err) {
    console.error('[TAIUpdateCounts] Error:', err);
  }
  process.exit(0);
}

main();
