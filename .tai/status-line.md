# TAI Status Line Specification

The status line is a single-line terminal display rendered after session initialization and refreshed during the session. It provides at-a-glance session health.

## Format

```
│ ROLE │ Sprint Name │ N/M ISC │ HOOKS: status │ duration │ TAI vX.Y.Z │ 0 violations │
```

## Segments

### 1. Role
- **Source**: Resolved role from CORE.md step 1 (TAI_ROLE, git email match, or default)
- **Display**: Uppercase role name — `ARCHITECT`, `DEVELOPER`, `QA`
- **Color**: Always white/default

### 2. Sprint Name
- **Source**: `.tai/context/sprint-current.md` — first `# ` heading
- **Display**: Sprint name as written (e.g., "Sprint 3: API Layer")
- **Color**: Always white/default

### 3. ISC Progress
- **Source**: `.tai/context/sprint-current.md` — count `- [x]` vs total `- [ ]` and `- [x]` under ISC section
- **Display**: `N/M ISC` where N = checked, M = total
- **Color**:
  - Green: N/M > 75%
  - Yellow: N/M between 25% and 75%
  - Red: N/M < 25%

### 4. Hook Status
- **Source**: `.tai/telemetry/hooks.jsonl` — most recent event
- **Display**:
  - `HOOKS: PASS` — last hook execution passed
  - `HOOKS: BYPASS (reason)` — last hook was bypassed, show truncated reason
  - `HOOKS: FAIL check` — last hook failed, show which check failed (e.g., `tsc`, `eslint`)
  - `HOOKS: --` — no hook events yet this session
- **Color**:
  - Green: PASS
  - Yellow: BYPASS
  - Red: FAIL

### 5. Session Duration
- **Source**: `.tai/telemetry/sessions.jsonl` — most recent `session.start` timestamp for current user
- **Display**: Elapsed time since session start — `Xh Ym` or `Ym` if under 1 hour
- **Color**: Always white/default

### 6. TAI Version
- **Source**: `.tai/VERSION`
- **Display**: `TAI vX.Y.Z`
- **Color**: Always white/default

### 7. Boundary Status
- **Source**: `.tai/telemetry/boundaries.jsonl` — count events where `event` = `boundary.violation` in current session (since last `session.start`)
- **Display**: `N violations` where N = count
- **Color**:
  - Green: 0 violations
  - Red: 1 or more violations

## Refresh Triggers

The status line is re-rendered after:
1. Hook execution completes (pre-commit, pre-push, pre-pr)
2. Skill invocation completes
3. Telemetry write (any JSONL append)
4. Manual request via `/tai-health`

## Error Surfacing

When the most recent hook event has `result: "fail"`:
- The Hook Status segment shows the failing check name from `details.failures[0]`
- Example: `HOOKS: FAIL tsc` or `HOOKS: FAIL eslint`
- If `details.failures` is empty, show `HOOKS: FAIL unknown`

## Empty State

On first session with no telemetry data:
```
│ DEVELOPER │ Sprint 0: TAI Setup │ 0/6 ISC │ HOOKS: -- │ 0m │ TAI v1.0.0 │ 0 violations │
```
