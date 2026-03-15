# Skill: /tai-boundaries

## Role Access
- Architect only

## Trigger
Architect runs `/tai-boundaries` to review boundary violation history.

## Pre-conditions
- Telemetry file exists at `.tai/telemetry/boundaries.jsonl`
- Current user role is `architect` (deny access otherwise)

## Steps

1. Determine current user role from CORE.md role identification.
2. Verify role is `architect`. If not, display: "Access denied. /tai-boundaries is restricted to the Architect role."
3. Read `.tai/telemetry/boundaries.jsonl`.
4. Filter events where `event` = `"boundary.violation"`.
5. Sort chronologically (newest first).
6. For each violation, extract:
   - `timestamp` — when it occurred
   - `user` — who triggered it
   - `details.file` — the file containing the violation
   - `details.import_path` — the forbidden import
   - `details.rule` — which boundary rule was violated
   - `details.action` — what enforcement action was taken (e.g., `commit_blocked`)
7. Format output as chronological table.

## Output Format

```
═══ TAI Boundary Violations ════════════════════

Date        User          File                                    Import                              Action
──────────  ────────────  ──────────────────────────────────────  ──────────────────────────────────  ──────────────
2026-03-18  developer-1   src/services/extraction/parser.ts       src/services/pricing/calculator      commit_blocked
2026-03-17  developer-2   src/services/pricing/engine.ts          src/services/extraction/ocr          commit_blocked

Rule violated: src/services/extraction/** → src/services/pricing/**

Total: 2 violations
```

### Empty State
```
═══ TAI Boundary Violations ════════════════════
No boundary violations recorded. Architecture constraints are being respected.
```

## Telemetry Fields Read
- `boundaries.jsonl`: `timestamp`, `event`, `user`, `role`, `details.file`, `details.line`, `details.import_path`, `details.rule`, `details.action`

## Privacy
- Architect-only access. Developers and QA cannot view violation history.
- Individual developer violations are attributed by name for accountability.
