# Skill: /tai-usage

## Role Access
- Architect (sees all users' aggregate and individual metrics)
- Developer (sees own metrics only)

## Trigger
User runs `/tai-usage` to view AI usage metrics.

## Pre-conditions
- Telemetry files exist at `.tai/telemetry/ai-usage.jsonl` and `.tai/telemetry/sessions.jsonl`
- Role has been resolved via CORE.md session initialization

## Steps

1. Determine current user role and identity from CORE.md role identification.
2. Read `.tai/telemetry/ai-usage.jsonl`.
3. Read `.tai/telemetry/sessions.jsonl`.
4. Apply access control:
   - **Architect**: show all users' data, both aggregate and per-user breakdown.
   - **Developer**: filter to events where `user` matches current `git config user.name`. Show own metrics only.
5. Aggregate ai-usage events:
   - Model split: count sessions by `details.model`, compute percentage.
   - Token spend: sum `details.estimated_tokens` and `details.estimated_cost_usd`.
   - Task type breakdown: group by `details.task_type`.
6. Aggregate session events:
   - Count sessions per user (from `session.start` events).
   - Total session time from `session.end` events' `details.duration_minutes`.
7. Format output based on role.

## Output Format

### Architect View
```
═══ TAI AI Usage ════════════════════════════════

Model Split:
  claude-sonnet-4-6:    32 sessions (71%)
  claude-opus-4-6:      13 sessions (29%)

Estimated Spend:
  Total tokens:    1,240,000
  Estimated cost:  $4.15

Task Type Breakdown:
  code_generation:   28 sessions
  code_review:       10 sessions
  test_generation:    7 sessions

Per-User Sessions:
  User            Sessions   Est. Cost
  ────────────    ────────   ─────────
  developer-1     22         $2.10
  developer-2     15         $1.40
  architect-1      8         $0.65
```

### Developer View
```
═══ TAI AI Usage (your metrics) ═════════════════

Model Split:
  claude-sonnet-4-6:    18 sessions (82%)
  claude-opus-4-6:       4 sessions (18%)

Estimated Spend:
  Total tokens:    520,000
  Estimated cost:  $2.10

Task Type Breakdown:
  code_generation:   14 sessions
  test_generation:    8 sessions

Sessions: 22 total
```

### Empty State
```
═══ TAI AI Usage ════════════════════════════════
No AI usage data recorded yet. Usage is logged to .tai/telemetry/ai-usage.jsonl at session end.
```

## Telemetry Fields Read
- `ai-usage.jsonl`: `timestamp`, `event`, `user`, `details.model`, `details.estimated_tokens`, `details.estimated_cost_usd`, `details.task_type`
- `sessions.jsonl`: `timestamp`, `event`, `user`, `details.duration_minutes`

## Privacy
- **Developers CANNOT see other developers' individual metrics.** This is a hard constraint.
- Developers see only their own model split, token spend, and session counts.
- Architect sees all users' data including per-user cost breakdown.
- QA role has no access to this skill.
