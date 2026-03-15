# TAI Session Protocol

TAI (Team AI Infrastructure) activates on session start. This file is loaded by Claude Code after CLAUDE.md and orchestrates role-aware, sprint-aware, discipline-enforced sessions.

## Session Initialization

On session start, execute this sequence:

### 1. Identify Role

Determine the current developer's role:

```
1. Check environment variable: TAI_ROLE
   - If set to "architect", "developer", or "qa" → use that role
   - If set to any other value → warn and fall back to step 2

2. Check git email: git config user.email
   - Match against .tai/config/team.yaml members[].email
   - If matched → use that member's role

3. Default: "developer"
   - Log warning to .tai/telemetry/sessions.jsonl:
     {"event": "role.default", "reason": "no match for email or TAI_ROLE"}
```

### 2. Load Role Context

Read the role-specific context file:
- Architect → `.tai/roles/architect.md`
- Developer → `.tai/roles/developer.md`
- QA → `.tai/roles/qa.md`

The role file defines: operational directives, boundary constraints, available skills, verification checklist, and escalation protocol.

### 3. Load Sprint Context

Read `.tai/context/sprint-current.md` for:
- Current sprint name, dates, objectives
- ISC (Ideal State Criteria) with checkbox status
- Task assignments per role

### 4. Load Architecture Context

Read these files for hard constraints:
- `.tai/context/boundaries.md` — forbidden import paths, service separation rules
- `.tai/context/patterns.md` — code conventions, naming standards, file organization

### 5. Activate Hooks

Verify hooks are installed:
- `.tai/hooks/pre-commit.sh` → git pre-commit
- `.tai/hooks/pre-push.sh` → git pre-push
- `.tai/hooks/post-session.sh` → Claude Code post-session

If hooks are not installed as git hooks, warn:
```
⚠️ TAI hooks not installed. Run: .tai/hooks/install.sh
```

### 6. Initialize Telemetry

Write session start event to `.tai/telemetry/sessions.jsonl`:
```json
{
  "timestamp": "<ISO-8601>",
  "event": "session.start",
  "user": "<git user.name>",
  "role": "<resolved role>",
  "tai_version": "<from .tai/VERSION>"
}
```

### 7. Display Status

Output the TAI status line as specified in `.tai/status-line.md`:
```
│ <ROLE> │ <Sprint Name> │ <N/M ISC> │ HOOKS: <status> │ <duration> │ TAI v<version> │ <N> violations │
```

See `.tai/status-line.md` for segment data sources, color coding, refresh triggers, and error surfacing rules.

## Operational Rules

### For All Roles
- Follow patterns defined in `.tai/context/patterns.md`
- Never violate boundaries defined in `.tai/context/boundaries.md`
- Log skill invocations to `.tai/telemetry/sessions.jsonl`
- Use the model specified in `.tai/config/models.yaml` for the current task type

### Role-Specific Behavior
- **Architect**: Full codebase access. Makes architecture decisions. Reviews all PRs. Loads all skills.
- **Developer**: Scoped to assigned features + shared modules. Must run /pre-pr before submitting. Cannot make architecture decisions without architect consultation.
- **QA**: Full read access, write access to test directories only. Focuses on test coverage, scenario validation, and regression detection.

### Observability Commands
All roles can run `/tai-sprint` to view sprint status. Additional query skills in `.tai/skills/query/`:
- `/tai-sessions` — Session activity log (Architect: all users; Developer/QA: own only)
- `/tai-bypasses` — Hook bypass history (Architect only)
- `/tai-boundaries` — Boundary violation history (Architect only)
- `/tai-sprint` — Current sprint status with ISC progress (all roles)
- `/tai-health` — Project health dashboard (Architect, QA)
- `/tai-usage` — AI model usage and cost metrics (Architect: all; Developer: own only)

### Verification Discipline
- Pre-commit: linter + type checker + boundary scan must pass
- Pre-push: full test suite must pass
- Pre-PR: all of the above + build + PR description with AI disclosure
- Hook bypass requires a mandatory reason string, logged to telemetry

## Version Check

Current TAI version: read from `.tai/VERSION`
Display in status line. If team.yaml specifies a minimum version, warn if current < minimum.
