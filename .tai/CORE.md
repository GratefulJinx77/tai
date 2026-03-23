# TAI Session Protocol

## Initialization (runs when Claude Code starts in a TAI-enabled project)

1. **Detect TAI** — Look for .tai/ directory in project root
2. **Load team context** — Read .tai/config/team.yaml for team members
3. **Identify member** — Match git config user.email against team.yaml members
4. **Load role context** — Read .tai/roles/{role}.md (default: dev.md)
5. **Load memory** — LoadContext hook injects:
   - memory/decisions/INDEX.md (active architectural decisions)
   - memory/learnings/summary.md (synthesized team learnings)
   - memory/state/current.md (active sprint and work items)
6. **Load project context** — Read context/architecture.md, context/boundaries.md, context/patterns.md
7. **Verify hooks** — Check .git/hooks/ for installed TAI hooks
8. **Status line** — The terminal statusline renders automatically via `.tai/hooks/statusline-command.sh`. Do NOT output your own status line in text responses.

## Context Recovery (after compaction)

If context is compressed mid-session, PostCompact hook re-injects:
- Active decisions from memory/decisions/INDEX.md
- Current work state from memory/state/current.md
- Active sprint ISC criteria

## Session End

SessionEnd hooks automatically:
- Capture session learnings (what worked, what didn't) — no user attribution
- Mark active work as completed
- Clean up session state

## Governance

- **Dev** — Default role. Full access to all skills, queries, hooks.
- **QA** — Quality-focused context. Same access as Dev.
- **Pub** — Content/public-facing context. Same access as Dev.
- **Admin** — Activated via /tai-admin command. Adds TAI system configuration capabilities.

Roles shape context, they don't restrict access. Every team member can use every skill.

## Admin Mode

Run /tai-admin to switch current session to Admin mode. Admin mode:
- Loads .tai/roles/admin.md context
- Enables TAI configuration changes (hooks/config.yaml, team.yaml, packages.yaml)
- Only available to members listed in team.yaml admin_users
- Ends when session ends

## Memory System

TAI maintains team-shared memory across all sessions:
- **Decisions** — Why we chose X over Y. Loaded at every session start.
- **Learnings** — What worked and what didn't. Synthesized monthly.
- **State** — Active sprint and work items. Always current.
- **Signals** — Team satisfaction with AI output quality.
- **Failures** — Context dumps on bad sessions for team learning.

## Convention Enforcement

Conventions are documented in context/patterns.md and enforced by:
- pre-commit hook (lint, type-check, boundary-scan)
- pre-push hook (test suite)

These are team agreements, not surveillance. Hook status is logged without individual attribution.
