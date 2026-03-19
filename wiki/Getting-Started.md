# Getting Started

Set up TAI in your project in about 5 minutes.

## Prerequisites

- **Node.js** 18+ or **Bun** runtime
- **Claude Code** installed and configured
- **git** initialized in your project (`git init`)

## Installation

### Option 1: CLI (recommended)

```bash
npm install -g @tai/cli
tai init
```

### Option 2: npx (no global install)

```bash
npx @tai/cli init
```

### Option 3: Manual

Copy the `.tai/` directory from the TAI repository into your project root.

The `tai init` command scaffolds the full `.tai/` directory structure with template configuration files ready to fill in.

### Force Overwrite

If `.tai/` already exists:

```bash
tai init --force
```

## First-Time Setup

### 1. Configure Your Team

Edit `.tai/config/team.yaml`:

```yaml
team:
  name: "My Project"
  admin_users: ["alice@company.com"]
  members:
    - name: "Alice"
      email: "alice@company.com"       # Must match git config user.email
      github: "alice-gh"
      default_role: dev                # dev | qa | pub
    - name: "Bob"
      email: "bob@company.com"
      github: "bob-gh"
      default_role: qa
  notifications:
    platform: "slack"                  # teams | slack | discord
    webhook_url: ""
    channel: ""
```

The `email` field must match each member's `git config user.email` -- this is how TAI identifies who is running the session.

### 2. Configure Your Project

Edit `.tai/config/project.yaml`:

```yaml
project:
  name: "My Project"
  description: "What this project does"

  stack:
    language: "TypeScript"
    framework: "React"
    database: "PostgreSQL"
    build_tool: "Vite"
    test_runner: "Vitest"
    linter: "ESLint"
    type_checker: "tsc"

  commands:
    build: "npm run build"
    test: "npm test"
    lint: "npm run lint"
    type_check: "npx tsc --noEmit"
    dev: "npm run dev"
```

### 3. Define Boundaries and Patterns

- `.tai/context/boundaries.md` -- Forbidden imports, service separation rules
- `.tai/context/patterns.md` -- Naming conventions, code patterns, testing conventions

These files are loaded into every Claude Code session to keep AI-generated code consistent with team standards.

### 4. Install Hooks

```bash
.tai/hooks/install.sh
```

This installs required and recommended hooks by default. See [[Hook System]] for installation modes.

### 5. Register Hooks with Claude Code

Copy the relevant sections from `.tai/hooks/settings-template.json` into your Claude Code `settings.json`. The template contains all hook registrations organized by event type.

## First Session Walkthrough

When you launch Claude Code in a TAI-enabled project, the following happens automatically:

1. **Team detection** -- `.tai/CORE.md` is loaded via CLAUDE.md
2. **Member identification** -- Your `git config user.email` is matched against `team.yaml`
3. **Role context** -- Your role file (`.tai/roles/dev.md` by default) is loaded
4. **Memory injection** -- The LoadContext hook injects:
   - Active architectural decisions from `memory/decisions/INDEX.md`
   - Synthesized team learnings from `memory/learnings/summary.md`
   - Current work state from `memory/state/current.md`
5. **Project context** -- Architecture, boundaries, and patterns are loaded
6. **Hook verification** -- Installed hooks are confirmed
7. **Status line** -- The rich status display renders:

```
── | TAI STATUSLINE | ──────────────────────────
ENV: CC: 2.1.76 | TAI:2.0.0 | SK: 10 | Hooks: 12
────────────────────────────────────────────────
* CONTEXT: [====------]
────────────────────────────────────────────────
+ PWD: my-project | Branch: main | Role: DEV
────────────────────────────────────────────────
@ MEMORY: 0 Decisions | 0 Learnings | 0 Signals
────────────────────────────────────────────────
# SPRINT: No active sprint | 0/0 ISC | --
────────────────────────────────────────────────
```

## Verifying Setup

Run `tai status` to confirm everything is configured:

```bash
tai status
```

This shows:
- Installed skill packages and their versions
- Active hooks and their tiers
- Memory store statistics (decision count, learning count, signal count)

## Next Steps

- [[Governance]] -- Understand roles and admin mode
- [[Hook System]] -- Customize enforcement for your team
- [[Memory System]] -- Start recording architectural decisions
- [[Skill Packages]] -- Install additional skill packages
