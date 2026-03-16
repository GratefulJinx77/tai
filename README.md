# TAI — Team AI Infrastructure

A discipline framework for AI-assisted development teams. TAI makes Claude Code operate within team-defined boundaries: role-aware sessions, mechanical enforcement hooks, sprint context injection, and structured telemetry.

TAI is not a replacement for Claude Code. It is the layer on top. Claude Code is the engine. TAI is the assembly line.

## Quick Start (5 minutes)

### 1. Copy .tai/ into your project

```bash
# From your project root:
cp -r /path/to/tai/.tai/ .tai/
```

### 2. Configure your team

Edit `.tai/config/team.yaml`:
```yaml
team:
  name: "My Project"
  members:
    - name: "Alice"
      email: "alice@company.com"    # Must match: git config user.email
      role: architect
      github: "alice-gh"
      skills: [all]
    - name: "Bob"
      email: "bob@company.com"
      role: developer
      github: "bob-gh"
      skills: [development, quality]
```

### 3. Configure your project stack

Edit `.tai/config/project.yaml`:
```yaml
project:
  name: "My Project"
  stack:
    language: "TypeScript"
    test_runner: "Vitest"
  commands:
    build: "npm run build"
    test: "npm test"
    lint: "npm run lint"
    type_check: "npx tsc --noEmit"
```

### 4. Define boundaries

Edit `.tai/context/boundaries.md` with your forbidden import rules. See `.tai/templates/boundaries-example.md` for examples.

### 5. Install hooks

```bash
.tai/hooks/install.sh
```

### 6. Launch Claude Code

TAI activates automatically. You'll see:
```
│ ARCHITECT │ Sprint 0: Setup │ 0/6 ISC │ HOOKS: PASS │ 0m │ TAI v1.0.0 │
```

## How It Works

### Session Initialization

When you launch Claude Code in a TAI-configured project:

1. **CLAUDE.md** loads (standard Claude Code behavior)
2. **CORE.md** activates — identifies your role via `git config user.email`
3. **Role context** loads — architect, developer, or QA session
4. **Sprint context** loads — current objectives and ISC criteria
5. **Architecture context** loads — boundaries and patterns
6. **Hooks activate** — enforcement gates on commit, push, and PR
7. **Status line** displays — role, sprint, hooks, version at a glance

### Role System

| Role | Focus | Skills | Verification |
|------|-------|--------|--------------|
| **Architect** | System coherence, decisions, reviews | All skills | Self-review + CI |
| **Developer** | Feature implementation, patterns | Development + quality | Pre-PR + architect review |
| **QA** | Test strategy, coverage, validation | Quality + test gen | Test pass + architect review |

Override your role: `export TAI_ROLE=architect`

### Enforcement Hooks

| Hook | Trigger | Checks |
|------|---------|--------|
| **pre-commit** | Before commit | Lint, type check, boundary scan |
| **pre-push** | Before push | Full test suite |
| **pre-pr** | Before PR | All of the above + build + PR desc |

Hooks **block** on failure. Bypass requires a mandatory reason: the reason is logged to telemetry and visible to the architect.

### Skills (11 core workflows)

**Development:** `/new-endpoint`, `/new-component`, `/new-migration`, `/formula-work`
**Quality:** `/pre-pr`, `/security-check`, `/test-generation`
**Architecture:** `/review-pr`, `/boundary-audit`, `/sprint-planning`
**Project:** `/sprint-init`

### Observability

**Status line** — persistent terminal bar showing role, sprint, ISC progress, hook status.

**Query commands:**
- `/tai-sessions` — who worked today, how long, what skills
- `/tai-bypasses` — hook bypass log with reasons
- `/tai-boundaries` — boundary violation history
- `/tai-sprint` — ISC progress and days remaining
- `/tai-health` — test trends, type safety, dependency health
- `/tai-usage` — AI model usage and cost estimates

### Telemetry

All events are JSONL, committed to git, aggregated by GitHub Action on push. No external infrastructure needed.

Files: `sessions.jsonl`, `hooks.jsonl`, `boundaries.jsonl`, `ai-usage.jsonl`
Schema: `.tai/telemetry/SCHEMA.md`

### Notifications

Configure in `team.yaml`. Supports Teams, Slack, and Discord webhooks.
Events: PR reviews, boundary violations, hook bypasses, sprint completions, build failures.

## Directory Structure

```
.tai/
├── CORE.md              # Session initialization protocol
├── VERSION              # Semver (1.0.0)
├── status-line.md       # Status line specification
├── config/              # team.yaml, project.yaml, models.yaml
├── context/             # architecture, boundaries, patterns, sprint-current
├── hooks/               # pre-commit, pre-push, pre-pr, post-session, boundary-scan, bypass, notify, install
├── roles/               # architect.md, developer.md, qa.md
├── skills/
│   ├── development/     # new-endpoint, new-component, new-migration, formula-work
│   ├── quality/         # pre-pr, security-check, test-generation
│   ├── architecture/    # review-pr, boundary-audit, sprint-planning
│   ├── project/         # sprint-init
│   └── query/           # tai-sessions, tai-bypasses, tai-boundaries, tai-sprint, tai-health, tai-usage
├── telemetry/           # JSONL logs + SCHEMA.md
├── templates/           # PR description, sprint ISC, boundary examples
└── docs/                # migration-guide.md, versioning.md
```

## Migrating from CLAUDE.md

See `.tai/docs/migration-guide.md` for step-by-step instructions on extracting architecture boundaries, code patterns, and sprint context from your existing CLAUDE.md into .tai/context/ files.

## Versioning

TAI uses semver in `.tai/VERSION`. See `.tai/docs/versioning.md` for bump criteria and workflow.

## Origin

Forked from [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/Personal_AI_Infrastructure) by Daniel Miessler. Licensed under MIT. TAI replaces the personal context layer with a team and project context layer.

## License

MIT
