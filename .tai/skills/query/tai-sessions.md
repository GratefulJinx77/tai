# Skill: /tai-sessions

## Role Access
- Architect (sees all users)
- Developer (sees own sessions only)
- QA (sees own sessions only)

## Trigger
User runs `/tai-sessions` to view session activity.

## Pre-conditions
- Telemetry file exists at `.tai/telemetry/sessions.jsonl`
- Role has been resolved via CORE.md session initialization

## Steps

1. Determine current user role and identity from CORE.md role identification.
2. Read `.tai/telemetry/sessions.jsonl`.
3. Apply access control:
   - **Architect**: show all users' sessions.
   - **Developer / QA**: filter to events where `user` matches current `git config user.name`.
4. Parse JSONL — extract `session.start` and `session.end` events.
5. For each session pair (start + end):
   - Compute duration from `details.duration_minutes` on `session.end`, or elapsed since `session.start` if no end event.
   - Collect `details.skills_used` from `session.end`.
6. Group sessions by date, then by user.
7. Format output as table.

## Output Format

```
═══ TAI Sessions ═══════════════════════════════

Date        User          Role       Duration   Skills Used
──────────  ────────────  ─────────  ─────────  ─────────────────
2026-03-18  developer-1   developer  1h 30m     new-endpoint, pre-pr
2026-03-18  developer-2   developer  45m        test-generation
2026-03-17  architect-1   architect  2h 10m     sprint-planning, review-pr

Total: 3 sessions | 2 users | 4h 25m total time
```

### Empty State
```
═══ TAI Sessions ═══════════════════════════════
No session data recorded yet. Sessions are logged to .tai/telemetry/sessions.jsonl on session start/end.
```

## Telemetry Fields Read
- `sessions.jsonl`: `timestamp`, `event`, `user`, `role`, `details.duration_minutes`, `details.skills_used`

## Privacy
- Developers see only their own session history.
- Architect sees all sessions across all users.
- No token or cost data is exposed by this skill (use `/tai-usage` for that).
