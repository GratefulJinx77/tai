# TAI — Team AI Infrastructure

A shared brain for AI-assisted development teams. TAI loads consistent context, shared memory, and team conventions into every Claude Code session automatically.

TAI is not enforcement. It is alignment. Every team member gets the same architecture context, the same boundaries, the same patterns — and a shared memory of why decisions were made.

## Quick Start (5 minutes)

### 1. Initialize TAI in your project

```bash
npx @tai/cli init
# or copy .tai/ manually into your project root
```

### 2. Configure your team

Edit `.tai/config/team.yaml`:
```yaml
team:
  name: "My Project"
  admin_users: ["alice@company.com"]
  members:
    - name: "Alice"
      email: "alice@company.com"
      github: "alice-gh"
      default_role: dev
    - name: "Bob"
      email: "bob@company.com"
      github: "bob-gh"
      default_role: qa
```

### 3. Configure your project

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

### 4. Define boundaries and patterns

- `.tai/context/boundaries.md` — Forbidden imports, service separation rules
- `.tai/context/patterns.md` — Naming conventions, code patterns, testing conventions

### 5. Install hooks

```bash
.tai/hooks/install.sh
```

### 6. Launch Claude Code

TAI activates automatically. You'll see the status line:
```
── | TAI STATUSLINE | ──────────────────────────
ENV: CC: 2.1.78 | TAI:2.0.0 | SK: 11 | Hooks: 30
◈ PWD: my-project | Branch: main | Role: DEV
◎ MEMORY: 0 Decisions | 0 Learnings | 0 Signals
◐ SPRINT: Sprint 1: Setup | 0/8 ISC
```

## Governance

TAI uses flat roles that shape context, not restrict access.

| Role | Focus | Access |
|------|-------|--------|
| **Dev** | Default. Feature work, patterns, boundaries. | All skills, all queries |
| **QA** | Testing, coverage, validation emphasis. | All skills, all queries |
| **Pub** | Content, docs, public-facing assets. | All skills, all queries |
| **Admin** | TAI system configuration. Activated via `/tai-admin`. | All skills + TAI config |

Every team member can use every skill. Roles load different context files (`.tai/roles/{role}.md`) to shape AI behavior for different workflows.

### Admin Mode

Team admins (listed in `team.yaml admin_users`) can run `/tai-admin` to configure TAI itself: edit hooks, update team membership, manage packages.

## Hook System

TAI provides 30 hooks across three categories, managed via `hooks/config.yaml`.

### Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Memory** | Context loading, recovery, learnings | LoadContext, PreCompact, PostCompact, PRDSync |
| **Git** | Code quality at commit/push/PR | pre-commit, pre-push, boundary-scan |
| **Workflow** | Team workflow automation | DeployVerify, SecurityValidator, AlgorithmGuard |

### Tiers (configured in hooks/config.yaml)

| Tier | Behavior |
|------|----------|
| **Required** | Always installed. Cannot be skipped. |
| **Recommended** | Installed by default. Can be opted out. |
| **Optional** | Available but not installed unless opted in. |

Optional hooks include Kitty terminal integration (tab colors, titles) and voice announcements (ElevenLabs TTS).

## Memory System

TAI maintains five shared memory stores across all sessions:

| Store | Purpose | Loaded At |
|-------|---------|-----------|
| **Decisions** | Why we chose X over Y | Every session start |
| **Learnings** | What worked, what didn't | Every session start |
| **State** | Active sprint, work items | Every session start |
| **Signals** | Team satisfaction with AI quality | On demand |
| **Failures** | Context dumps from bad sessions | On demand |

Memory is team-shared and committed to git. No external infrastructure required. No individual attribution — learnings and signals are anonymous.

### Decisions

```markdown
<!-- memory/decisions/2026-03-19-chose-postgres.md -->
---
title: "Chose PostgreSQL over MongoDB"
date: 2026-03-19
status: active
tags: [architecture, database]
---

## Decision
PostgreSQL with pg-boss for job queues.

## Rationale
Need relational queries for financial data.

## Alternatives Considered
- **MongoDB** — Rejected: no joins
- **SQLite** — Rejected: no concurrent writes
```

Decisions are indexed in `memory/decisions/INDEX.md` and loaded at every session start.

### Context Recovery

If Claude Code compacts context mid-session, the PostCompact hook re-injects active decisions and current work state automatically.

## Skill Packages

Skills are workflow definitions organized into versioned packages. Managed via `packages.yaml`:

```yaml
skills:
  core:             { version: "1.0.0", tier: required }
  thinking:         { version: "1.0.0", tier: required }
  research:         { version: "1.0.0", tier: required }
  agents:           { version: "1.0.0", tier: required }
  security:         { version: "1.0.0", tier: recommended }
  utilities:        { version: "1.0.0", tier: recommended }
  project-audit:    { version: "1.0.0", tier: recommended }
  media:            { version: "1.0.0", tier: optional }
  content-analysis: { version: "1.0.0", tier: optional }
  scraping:         { version: "1.0.0", tier: optional }
```

### Installing Packages

```bash
tai install              # Install all required + recommended
tai install security     # Install a specific package
tai status               # Show installed packages
```

## Agents

TAI includes 16 agents organized into 6 groups:

| Group | Agents | Purpose |
|-------|--------|---------|
| **Core** (7) | Engineer, Architect, Designer, QATester, BrowserAgent, UIReviewer, visual-analyst | Development fundamentals |
| **Research** (5) | ClaudeResearcher, CodexResearcher, GeminiResearcher, GrokResearcher, PerplexityResearcher | Multi-model research |
| **Security** (1) | Pentester | Offensive security testing |
| **Creative** (1) | Artist | Visual content creation |
| **Execution** (1) | Algorithm | 7-phase execution methodology (OBSERVE-THINK-PLAN-BUILD-EXECUTE-VERIFY-LEARN) |
| **Ops** (1) | session-closer | End-of-day session archival |

Agents live in `.tai/agents/{group}/` and can be customized per project.

## CLI Tool

```bash
tai init          # Initialize .tai/ in current project
tai install       # Install skill/agent packages from packages.yaml
tai update        # Update installed packages to latest
tai status        # Show packages, hooks, memory stats
```

## Status Line

TAI displays a rich multi-segment status line at session start:

```
── | TAI STATUSLINE | ──────────────────────────
ENV: CC: {version} | TAI:{version} | SK: {count} | Hooks: {count}
◉ CONTEXT: {context window usage bar}
◈ PWD: {project} | Branch: {branch} | Role: {role}
◎ MEMORY: {n} Decisions | {n} Learnings | {n} Signals
◐ SPRINT: {name} | {n}/{m} ISC | {status}
```

See `.tai/status-line.md` for the full specification.

## Directory Structure

```
.tai/
├── CORE.md              # Session initialization protocol
├── VERSION              # 2.0.0
├── CONTEXT_ROUTING.md   # Topic-to-file mapping
├── PRDFORMAT.md         # Work tracking format (ISC criteria)
├── status-line.md       # Rich status display spec
├── packages.yaml        # Skill/agent package registry
├── config/
│   ├── team.yaml        # Team members, admin_users, notifications
│   ├── project.yaml     # Stack, commands, project details
│   └── models.yaml      # AI model configuration
├── context/
│   ├── architecture.md  # System architecture documentation
│   ├── boundaries.md    # Forbidden imports, service separation
│   ├── patterns.md      # Code conventions with examples/counter-examples
│   └── sprint-current.md # Active sprint, ISC criteria
├── hooks/
│   ├── config.yaml      # Hook tiers (required/recommended/optional)
│   ├── settings-template.json  # Claude Code hook registration
│   ├── install.sh       # Hook installer (reads config.yaml)
│   ├── lib/             # 13 shared TypeScript utilities
│   ├── *.hook.ts        # 30 TypeScript hook implementations
│   └── *.sh             # Bash git hooks (pre-commit, pre-push, pre-pr)
├── roles/
│   ├── dev.md           # Default role — no restrictions
│   ├── qa.md            # Quality-focused context
│   ├── pub.md           # Public-facing content context
│   └── admin.md         # TAI configuration (via /tai-admin)
├── skills/
│   ├── core/            # 17 TAI-native skills + /tai-admin
│   ├── thinking/        # First principles, council, red team, brainstorm
│   ├── research/        # Multi-agent research, content extraction
│   ├── security/        # Recon, web assessment, prompt injection
│   ├── agents/          # Agent composition, parallel spawning
│   ├── media/           # Art, diagrams, mermaid, video
│   ├── content-analysis/ # Wisdom extraction
│   ├── scraping/        # Web scraping (Bright Data, Apify)
│   ├── utilities/       # CLI gen, browser automation, skill scaffolding
│   ├── project-audit/   # Parallel agent codebase audit
│   └── custom/          # Team-built skills
├── agents/
│   ├── core/            # Engineer, Architect, Designer, QATester, BrowserAgent, UIReviewer, visual-analyst
│   ├── research/        # ClaudeResearcher, CodexResearcher, GeminiResearcher, GrokResearcher, PerplexityResearcher
│   ├── security/        # Pentester
│   ├── creative/        # Artist
│   ├── execution/       # Algorithm
│   ├── ops/             # session-closer
│   └── custom/          # Team-built agents
├── memory/
│   ├── decisions/       # Architectural decisions + INDEX.md + TEMPLATE.md
│   ├── learnings/       # Team learnings (JSONL) + summary.md
│   ├── state/           # Active work + current.md
│   ├── signals/         # AI quality signals (JSONL, no attribution)
│   └── failures/        # Bad session context dumps
├── agent-memory/        # Per-agent memory (auto-scaffolded by SubagentStop hook)
├── telemetry/           # JSONL logs (sessions, hooks, boundaries)
└── templates/           # PR description, sprint ISC, boundary examples
```

## Adding Custom Hooks

1. Create your hook in `.tai/hooks/my-hook.hook.ts`
2. Add it to `.tai/hooks/config.yaml` with category and tier
3. Add it to `.tai/hooks/settings-template.json` with the lifecycle event
4. Run `.tai/hooks/install.sh` to activate

## Adding Custom Skills

1. Create `.tai/skills/custom/my-skill/SKILL.md` with trigger, steps, and verification
2. The skill is immediately available in Claude Code sessions

## Adding Custom Agents

1. Create `.tai/agents/custom/my-agent.md` with role, context, and directives
2. The agent is immediately available for subagent invocations

## Migration Guide

### From plain CLAUDE.md

1. Run `tai init` to scaffold `.tai/`
2. Move architecture documentation to `.tai/context/architecture.md`
3. Move boundary rules to `.tai/context/boundaries.md`
4. Move code conventions to `.tai/context/patterns.md`
5. Add team members to `.tai/config/team.yaml`
6. Install hooks: `.tai/hooks/install.sh`
7. Trim CLAUDE.md to project description + pointer to `.tai/CORE.md`

### From TAI v1.x

1. Replace `.tai/roles/architect.md` and `.tai/roles/developer.md` with new role files (dev.md, qa.md, pub.md, admin.md)
2. Update `.tai/config/team.yaml` — replace `role` field with `default_role`, add `admin_users`
3. Remove TAI_ROLE environment variable usage — roles are now matched by git email
4. Create `.tai/memory/` directory structure (decisions/, learnings/, state/, signals/, failures/)
5. Update `.tai/CORE.md` from this repository
6. Bump `.tai/VERSION` to 2.0.0

## Origin

TAI is a team-focused fork of PAI (Personal AI Infrastructure). Licensed under MIT.

## License

MIT
