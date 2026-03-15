# CLAUDE.md Migration Guide

How to migrate existing CLAUDE.md content into the .tai/ framework.

## What Moves Where

### .tai/context/architecture.md

Move system overview and module structure content:

- High-level architecture description
- Service/module boundaries and responsibilities
- Database schema overview
- API surface and integration points
- Infrastructure topology (if documented)

### .tai/context/boundaries.md

Move enforcement rules and forbidden patterns:

- Forbidden imports (e.g., "UI must not import from database layer")
- Service separation rules (e.g., "API handlers must not call ORM directly")
- Dependency direction constraints
- File/directory access restrictions between modules

### .tai/context/patterns.md

Move conventions and style guidance:

- Naming conventions (files, functions, variables, classes)
- File organization rules (where new files go, directory structure)
- Code style preferences beyond what linters enforce
- Error handling patterns
- Testing conventions (file naming, test structure, mocking approach)

### .tai/context/sprint-current.md

Move active work items:

- Current sprint objectives
- In-scope criteria (ISC) — what "done" looks like
- Known blockers or risks
- Items explicitly out of scope

### What STAYS in CLAUDE.md

Keep the following in your project's CLAUDE.md:

- Project name and one-line description
- Tech stack (language, framework, major dependencies)
- Build/run/test commands (`npm run dev`, `go test ./...`, etc.)
- Directory overview (top-level structure)
- Environment setup instructions

### What to ADD to CLAUDE.md

Add one reference line so Claude discovers the .tai/ framework:

```
See .tai/ for team framework, roles, skills, and sprint context.
```

Place this near the top of CLAUDE.md, after the project name and tech stack.

## Step-by-Step Migration

### 1. Inventory your CLAUDE.md

Read through your existing CLAUDE.md and tag each section with its destination:

- `[arch]` — goes to architecture.md
- `[boundary]` — goes to boundaries.md
- `[pattern]` — goes to patterns.md
- `[sprint]` — goes to sprint-current.md
- `[keep]` — stays in CLAUDE.md

### 2. Populate .tai/context/ files

Copy tagged content into the appropriate .tai/context/ file. Use the existing template structure in each file — do not replace the file headers or format guidance.

### 3. Trim CLAUDE.md

Remove the migrated sections from CLAUDE.md. Keep only `[keep]`-tagged content.

### 4. Add the .tai/ reference line

Add to CLAUDE.md:

```
See .tai/ for team framework, roles, skills, and sprint context.
```

### 5. Configure team.yaml

Fill in `.tai/config/team.yaml` with team member names, emails, roles, and notification preferences.

### 6. Configure project.yaml

Fill in `.tai/config/project.yaml` with build, test, lint, and type-check commands for your project.

### 7. Install hooks

Run `.tai/hooks/install.sh` to symlink TAI hooks into `.git/hooks/`.

## Verification Checklist

After migration, confirm the following:

- [ ] CLAUDE.md contains only: project name, tech stack, build commands, directory overview, and the .tai/ reference line
- [ ] `.tai/context/architecture.md` has system overview content (or is intentionally empty for simple projects)
- [ ] `.tai/context/boundaries.md` has forbidden-import rules (or is intentionally empty)
- [ ] `.tai/context/patterns.md` has naming/style conventions (or is intentionally empty)
- [ ] `.tai/context/sprint-current.md` has current sprint objectives (or placeholder)
- [ ] `.tai/config/team.yaml` has at least one team member with correct email
- [ ] `.tai/config/project.yaml` has build and test commands
- [ ] `git commit` triggers TAI pre-commit hook (lint + boundary scan)
- [ ] No duplicate content exists between CLAUDE.md and .tai/context/ files
