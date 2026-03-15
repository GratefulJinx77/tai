# Skill: Sprint Init

## Role Access
- Architect

## Trigger
Architect starts a new sprint after sprint planning is complete.

## Pre-conditions
- New sprint plan has been created via the `sprint-planning` skill
- Current `sprint-current.md` exists and contains the outgoing sprint
- Telemetry directory exists at `.tai/telemetry/`
- Team notification configuration exists in `.tai/config/team.yaml`

## Steps

1. Read the current `.tai/context/sprint-current.md` to capture the outgoing sprint content.
2. Archive the outgoing sprint: copy `sprint-current.md` to `.tai/telemetry/sprint-{N}.md` where `{N}` is the outgoing sprint number.
3. Verify the archive was written correctly by reading it back.
4. Replace `.tai/context/sprint-current.md` with the new sprint content from sprint planning.
5. Verify all ISC criteria checkboxes in the new `sprint-current.md` are unchecked.
6. If a webhook is configured in `.tai/config/team.yaml`, notify the team that a new sprint has started.
7. Verify the new sprint is accessible: read `.tai/context/sprint-current.md` and confirm it contains the new sprint's objectives and ISC criteria.
8. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] Previous sprint is archived to `.tai/telemetry/sprint-{N}.md`
- [ ] New `sprint-current.md` is in place with correct content
- [ ] All ISC criteria checkboxes are unchecked in the new sprint
- [ ] Team is notified (if webhook configured)
