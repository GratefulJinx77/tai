/**
 * TAI Team Identity
 *
 * Reads team configuration from .tai/config/team.yaml.
 * TAI doesn't have personal identity (no DA_IDENTITY) -- it has team identity.
 * Team member resolution is based on git user.email matching team.yaml entries.
 */

import { readFileSync, existsSync } from 'fs';
import { taiPath } from './paths';

export interface TeamMember {
  name: string;
  email: string;
  role: string;
  timezone: string;
}

export interface TeamConfig {
  name: string;
  timezone: string;
  members: TeamMember[];
}

const DEFAULT_TEAM: TeamConfig = {
  name: 'Team',
  timezone: 'UTC',
  members: [],
};

let cachedTeam: TeamConfig | null = null;

/**
 * Simple YAML parser for team.yaml -- extracts top-level fields and members array.
 */
function parseTeamYaml(content: string): TeamConfig {
  const team: TeamConfig = { ...DEFAULT_TEAM, members: [] };

  const nameMatch = content.match(/^name:\s*(.+)$/m);
  if (nameMatch) team.name = nameMatch[1].trim().replace(/^["']|["']$/g, '');

  const tzMatch = content.match(/^timezone:\s*(.+)$/m);
  if (tzMatch) team.timezone = tzMatch[1].trim().replace(/^["']|["']$/g, '');

  // Parse members array
  const membersSection = content.match(/^members:\s*\n((?:\s+-[\s\S]*?)(?=\n[a-z]|\n$|$))/m);
  if (membersSection) {
    const memberBlocks = membersSection[1].split(/\n\s+-\s+/).filter(Boolean);
    for (const block of memberBlocks) {
      const lines = block.replace(/^\s+-\s+/, '').split('\n');
      const member: any = {};
      for (const line of lines) {
        const kvMatch = line.trim().match(/^(\w+):\s*(.+)$/);
        if (kvMatch) {
          member[kvMatch[1]] = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        }
      }
      if (member.name) {
        team.members.push({
          name: member.name || '',
          email: member.email || '',
          role: member.role || 'developer',
          timezone: member.timezone || team.timezone,
        });
      }
    }
  }

  return team;
}

/**
 * Load team configuration from .tai/config/team.yaml (cached)
 */
export function getTeamConfig(): TeamConfig {
  if (cachedTeam) return cachedTeam;

  try {
    const teamPath = taiPath('config', 'team.yaml');
    if (!existsSync(teamPath)) {
      cachedTeam = { ...DEFAULT_TEAM, members: [] };
      return cachedTeam;
    }

    const content = readFileSync(teamPath, 'utf-8');
    cachedTeam = parseTeamYaml(content);
    return cachedTeam;
  } catch {
    cachedTeam = { ...DEFAULT_TEAM, members: [] };
    return cachedTeam;
  }
}

/**
 * Get the team name
 */
export function getTeamName(): string {
  return getTeamConfig().name;
}

/**
 * Get the team timezone (default for the team)
 */
export function getTeamTimezone(): string {
  return getTeamConfig().timezone;
}

/**
 * Find a team member by email
 */
export function findMemberByEmail(email: string): TeamMember | null {
  const team = getTeamConfig();
  return team.members.find(m => m.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Get all team members
 */
export function getTeamMembers(): TeamMember[] {
  return getTeamConfig().members;
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  cachedTeam = null;
}
