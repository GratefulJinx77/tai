# Skill: Review PR

## Role Access
- Architect

## Trigger
Architect reviews a submitted pull request.

## Pre-conditions
- PR has been submitted with a description following `.tai/templates/pr-description.md`
- Project patterns defined in `.tai/context/patterns.md`
- Boundary rules defined in `.tai/context/boundaries.md`

## Steps

1. Read the PR description and verify it follows the template from `.tai/templates/pr-description.md`.
2. **Pattern compliance**: Review all changed files against `.tai/context/patterns.md`. Flag deviations from naming conventions, file organization, error handling, or API patterns.
3. **Boundary audit**: Scan all changed files for import statements. Check each import against `.tai/context/boundaries.md`. Flag any cross-boundary imports.
4. **Dependency review**: If new packages or dependencies were added, verify each is justified and does not duplicate existing functionality.
5. **Test coverage**: Verify that all new code paths have corresponding tests. Check that tests cover happy path, failure modes, and boundary cases.
6. **AI usage disclosure**: Verify the PR description includes an honest AI Usage Disclosure section. Flag if missing or incomplete.
7. **Type safety**: Verify shared types are updated if the PR changes API contracts or data shapes. Check that the type checker passes.
8. **Security review**: Check for common security issues (hardcoded secrets, SQL injection, XSS, missing auth checks) in changed files.
9. Compile review findings into categories: must-fix (blocking), should-fix (non-blocking), and observations.
10. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] All changed files follow patterns from `patterns.md`
- [ ] No boundary violations in changed files
- [ ] New dependencies are justified
- [ ] New code has adequate test coverage
- [ ] AI usage disclosure is present and complete
- [ ] Shared types are correct and up to date
- [ ] No security issues found in changed files
