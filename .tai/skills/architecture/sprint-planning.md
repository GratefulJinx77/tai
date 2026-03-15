# Skill: Sprint Planning

## Role Access
- Architect

## Trigger
Architect plans the next sprint.

## Pre-conditions
- Current sprint ISC exists in `.tai/context/sprint-current.md`
- Sprint ISC template exists at `.tai/templates/sprint-isc.md`
- Team roles and assignments defined in `.tai/config/team.yaml`

## Steps

1. Review the current sprint's ISC in `.tai/context/sprint-current.md`. Identify which criteria are checked (completed) and which are unchecked (incomplete).
2. Identify carryover items: unchecked ISC criteria that should continue into the next sprint.
3. Define new sprint objectives based on the project roadmap and carryover items.
4. Write ISC criteria for the new sprint. Each criterion must be:
   - **Atomic**: one verifiable thing (no "and" or "with" joining two tests)
   - **Binary**: either true or false, no judgment required
   - **State-based**: describes an end state, not an action
   - **8-12 words**
5. Apply the Splitting Test to each criterion: if a criterion could be split into two independent checks, split it.
6. Break down tasks by role (architect, developer, QA) based on the role definitions in `.tai/roles/`.
7. Identify dependencies between tasks — which tasks must complete before others can start.
8. Identify risks: what could go wrong and how to mitigate each risk.
9. Create the new `sprint-current.md` from the template at `.tai/templates/sprint-isc.md`.
10. Review the sprint plan: verify ISC criteria are atomic, tasks cover all roles, dependencies are mapped, and risks are documented.
11. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] All ISC criteria pass the Splitting Test (each is truly atomic)
- [ ] Tasks are assigned to all three roles (architect, developer, QA)
- [ ] Dependencies between tasks are mapped
- [ ] Risks are identified with mitigations
- [ ] `sprint-current.md` is written following the template
