# Skill: New Component

## Role Access
- Architect
- Developer

## Trigger
Developer requests a new React or UI component.

## Pre-conditions
- Project stack and commands defined in `.tai/config/project.yaml`
- Component patterns documented in `.tai/context/patterns.md` (structure, props, state management, styling)
- Boundary rules defined in `.tai/context/boundaries.md`

## Steps

1. Read `.tai/context/patterns.md` to identify component conventions (file naming, directory structure, prop typing, styling approach).
2. Read existing components to confirm actual patterns match documented patterns.
3. Determine whether this is a server component or client component based on its data needs and interactivity.
4. Create the component file in the correct directory following project conventions from `patterns.md`.
5. Define prop types (TypeScript interface or equivalent) for all component inputs.
6. Implement the component following the project's styling convention (Tailwind, CSS modules, styled-components, etc. as defined in `patterns.md`).
7. Ensure the component does not import across boundaries defined in `.tai/context/boundaries.md`.
8. Create a test file following the project's test naming convention.
9. Write tests covering: renders without errors, renders with required props, handles edge cases (empty data, missing optional props).
10. Run the test suite using the command from `.tai/config/project.yaml` → `commands.test`.
11. Run the type checker using the command from `.tai/config/project.yaml` → `commands.type_check`.
12. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] Prop types are fully defined for all component inputs
- [ ] Styling follows the project convention from `patterns.md`
- [ ] Component renders without errors
- [ ] No boundary violations in imports
- [ ] Test file exists and covers basic rendering scenarios
- [ ] All tests pass
- [ ] Type checker passes
