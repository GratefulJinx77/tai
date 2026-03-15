# Skill: Pre-PR

## Role Access
- Architect
- Developer
- QA

## Trigger
Developer runs `/pre-pr` before submitting a pull request.

## Pre-conditions
- Project stack and commands defined in `.tai/config/project.yaml`
- Boundary rules defined in `.tai/context/boundaries.md`
- PR description template exists at `.tai/templates/pr-description.md`
- Changes are staged or committed locally

## Steps

1. Run the linter using the command from `.tai/config/project.yaml` → `commands.lint`. Fix any failures before proceeding.
2. Run the type checker using the command from `.tai/config/project.yaml` → `commands.type_check`. Fix any failures before proceeding.
3. Run a boundary scan: check all changed files for import statements that violate `.tai/context/boundaries.md`. Report any violations.
4. Run the full test suite using the command from `.tai/config/project.yaml` → `commands.test`. Fix any failures before proceeding.
5. Run the build using the command from `.tai/config/project.yaml` → `commands.build`. Fix any failures before proceeding.
6. Generate a PR description from `.tai/templates/pr-description.md`:
   - Fill in the summary from commit messages
   - List all changes
   - Check all testing boxes that pass
   - Complete the AI Usage Disclosure section honestly
   - Reference the current sprint and relevant ISC criteria from `.tai/context/sprint-current.md`
7. Output the completed PR description for the developer to use.
8. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] Linter passes with zero errors
- [ ] Type checker passes with zero errors
- [ ] No boundary violations in changed files
- [ ] All tests pass
- [ ] Build succeeds
- [ ] PR description is complete with AI usage disclosure
