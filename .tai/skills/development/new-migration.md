# Skill: New Migration

## Role Access
- Architect
- Developer

## Trigger
Developer needs a database schema change (new table, column addition, index, constraint, etc.).

## Pre-conditions
- Project stack and commands defined in `.tai/config/project.yaml`
- Database patterns documented in `.tai/context/patterns.md` (migration format, naming conventions, query style)
- Existing migrations are accessible and in a consistent sequence

## Steps

1. Read `.tai/context/patterns.md` to identify migration conventions (file naming, numbering scheme, SQL style).
2. List existing migration files and verify the sequence has no gaps or conflicts.
3. Determine the next sequence number following the project's numbering scheme.
4. Create the migration file with the correct sequence number and a descriptive name.
5. Write the UP migration (the forward schema change).
6. Write the DOWN migration (the exact reversal of the UP migration).
7. Apply the UP migration and verify it succeeds.
8. Apply the DOWN migration and verify the schema returns to its previous state.
9. Re-apply the UP migration to leave the database in the desired state.
10. Run the full test suite using the command from `.tai/config/project.yaml` → `commands.test`.
11. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] Sequence number is correct with no gaps or conflicts
- [ ] UP migration applies cleanly
- [ ] DOWN migration reverses the UP migration cleanly
- [ ] UP can be re-applied after DOWN (full round-trip verified)
- [ ] All existing tests still pass
