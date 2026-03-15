# Skill: /tai-bypasses

## Role Access
- Architect only

## Trigger
Architect runs `/tai-bypasses` to review hook bypass history.

## Pre-conditions
- Telemetry file exists at `.tai/telemetry/hooks.jsonl`
- Current user role is `architect` (deny access otherwise)

## Steps

1. Determine current user role from CORE.md role identification.
2. Verify role is `architect`. If not, display: "Access denied. /tai-bypasses is restricted to the Architect role."
3. Read `.tai/telemetry/hooks.jsonl`.
4. Filter events where `result` = `"bypass"`.
5. Optionally filter by sprint or developer if arguments are provided:
   - `/tai-bypasses --user developer-1` — filter to one user
   - `/tai-bypasses --sprint "Sprint 3"` — filter to events within sprint date range
6. Sort bypasses chronologically (newest first).
7. Format output as table with bypass reasons.

## Output Format

```
═══ TAI Bypasses ═══════════════════════════════

Date        User          Hook         Reason
──────────  ────────────  ───────────  ──────────────────────────────────────
2026-03-18  developer-1   pre-commit   false positive - eslint rule conflict with generated types
2026-03-17  developer-2   pre-push     test environment unavailable (CI down)

Total: 2 bypasses
```

### Empty State
```
═══ TAI Bypasses ═══════════════════════════════
No bypasses recorded. All hooks have been honored.
```

## Telemetry Fields Read
- `hooks.jsonl`: `timestamp`, `event`, `user`, `role`, `result`, `bypass_reason`, `details.hook_bypassed`

## Privacy
- Architect-only access. Developers and QA cannot view bypass logs.
- All bypass reasons are visible to the architect for accountability.
