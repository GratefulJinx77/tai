# TAI — Team AI Infrastructure

A shared brain for AI-assisted development teams. TAI loads consistent context, shared memory, and team conventions into every Claude Code session automatically.

TAI is not enforcement. It is alignment. Every team member gets the same architecture context, the same boundaries, the same patterns — and a shared memory of why decisions were made.

## Prerequisites

| Dependency | Why | Install |
|------------|-----|---------|
| **jq** | Statusline and hooks parse JSON | `sudo apt install jq` / `brew install jq` |
| **bun** | Runs TypeScript hooks | [bun.sh](https://bun.sh) |
| **python3** | Installer settings merge | Pre-installed on most systems |
| **git** | Version control, hook installation | Pre-installed on most systems |
| **Claude Code** | The AI development tool TAI extends | [claude.ai/code](https://claude.ai/code) |

Verify all dependencies:
```bash
jq --version && bun --version && python3 --version && git --version
```

## Quick Start

### 1. Clone TAI into your project

```bash
cd /path/to/your-project
git clone https://github.com/GratefulJinx77/tai.git .tai-upstream
```

### 2. Install dependencies

```bash
cd .tai-upstream && bun install && cd ..
```

### 3. Run the installer

```bash
.tai-upstream/.tai/hooks/install.sh
```

This creates:
- `.tai/` — Instance directories (config, context, memory, roles)
- `.claude/settings.local.json` — 18 hooks + statusline registered with Claude Code
- `.claude/rules/tai.md` — Session initialization rules
- `.claude/commands/*.md` — 5 slash commands
- `.git/hooks/pre-commit`, `.git/hooks/pre-push` — Convention enforcement

Install modes:
```bash
.tai-upstream/.tai/hooks/install.sh              # Required + recommended (default)
.tai-upstream/.tai/hooks/install.sh --minimal     # Required hooks only
.tai-upstream/.tai/hooks/install.sh --all         # All hooks including optional
.tai-upstream/.tai/hooks/install.sh --list        # List all hooks and tiers
```

### 4. Configure your team

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

The `email` field must match each member's `git config user.email`.

### 5. Configure your project

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

Leave commands empty (`""`) to skip them in pre-commit/pre-push hooks.

### 6. Define boundaries and patterns

- `.tai/context/boundaries.md` — Forbidden imports, service separation rules
- `.tai/context/patterns.md` — Naming conventions, code patterns, testing conventions

### 7. Launch Claude Code

```bash
claude
```

TAI activates automatically. The statusline appears at the bottom:
```
-- | TAI | --------------------------------------------------
LOC: Your City | 09:15 | 72°F Clear
ENV: CC: 2.1.81 | TAI:2.0.0 | Hooks: 17 | Role: dev | Team: My Project
------------------------------------------------------------------------
@ CONTEXT: ⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁ 12%
------------------------------------------------------------------------
<> PWD: my-project | Branch: main | Age: 2h
------------------------------------------------------------------------
o MEMORY: D:0 Decisions | L:0 Learnings | S:0 Signals
------------------------------------------------------------------------
* SPRINT: Sprint 1: Setup | 0/8 ISC
```

### 8. Verify installation

```bash
# Settings file has hooks and statusline
grep -c '"hooks"' .claude/settings.local.json        # → 1
grep -c '"statusLine"' .claude/settings.local.json   # → 1

# Git hooks are linked
ls -la .git/hooks/pre-commit .git/hooks/pre-push     # → symlinks

# Slash commands registered
ls .claude/commands/                                  # → 5 .md files

# Hooks fire
echo '{}' | bun run .tai/hooks/LoadContext.hook.ts 2>&1 | head -3

# Statusline renders with context bar
echo '{"context_window":{"used_percentage":50}}' | bash .tai/hooks/statusline-command.sh 2>&1 | grep "%"
# → should show "CONTEXT: ⛁⛁⛁... 50%"
```

## Updating TAI

```bash
cd .tai-upstream && git pull && bun install && cd ..
.tai-upstream/.tai/hooks/install.sh
```

The installer never overwrites instance files (config, context, memory). It only re-registers hooks, slash commands, and rules.

## Governance

TAI uses flat roles that shape context, not restrict access.

| Role | Focus | Access |
|------|-------|--------|
| **Dev** | Default. Feature work, patterns, boundaries. | All skills, all queries |
| **QA** | Testing, coverage, validation emphasis. | All skills, all queries |
| **Pub** | Content, docs, public-facing assets. | All skills, all queries |
| **Admin** | TAI system configuration. Activated via `/tai-admin`. | All skills + TAI config |

Every team member can use every skill. Roles load different context files (`.tai/roles/{role}.md`) to shape AI behavior for different workflows.

## Hook System

TAI provides hooks across three tiers, managed via `hooks/config.yaml`.

| Category | Purpose | Examples |
|----------|---------|----------|
| **Memory** | Context loading, recovery, learnings | LoadContext, PreCompact, PostCompact, PRDSync |
| **Git** | Code quality at commit/push | pre-commit, pre-push, boundary-scan |
| **Workflow** | Team workflow automation | DeployVerify, SecurityValidator, AlgorithmGuard |

| Tier | Behavior |
|------|----------|
| **Required** | Always installed. Cannot be skipped. |
| **Recommended** | Installed by default. Can be skipped with `--minimal`. |
| **Optional** | Not installed unless `--all` is used. |

## Memory System

TAI maintains five shared memory stores across all sessions:

| Store | Purpose | Loaded At |
|-------|---------|-----------|
| **Decisions** | Why we chose X over Y | Every session start |
| **Learnings** | What worked, what didn't | Every session start |
| **State** | Active sprint, work items | Every session start |
| **Signals** | Team satisfaction with AI quality | On demand |
| **Failures** | Context dumps from bad sessions | On demand |

Memory is team-shared and committed to git. No external infrastructure required.

## Slash Commands

After installation, these commands are available in Claude Code:

| Command | Description |
|---------|-------------|
| `/tai-validate` | Validate TAI installation — checks all components |
| `/tai-admin` | Switch to Admin mode for system configuration |
| `/tai-sprint` | Show current sprint status and ISC progress |
| `/tai-decisions` | Show active team decisions |
| `/tai-health` | Show project health — hooks, boundaries, test status |

## Directory Structure

```
your-project/
├── .tai-upstream/           # TAI framework (git repo, pull to update)
│   └── .tai/
│       ├── hooks/           # Hook scripts + statusline
│       ├── skills/          # Skill packages
│       ├── agents/          # Agent definitions
│       └── ...
├── .tai/                    # Instance data (project-owned, never overwritten)
│   ├── config/              # team.yaml, project.yaml
│   ├── context/             # architecture.md, boundaries.md, patterns.md, sprint-current.md
│   ├── memory/              # decisions/, learnings/, state/, signals/, failures/
│   └── roles/               # dev.md, qa.md, pub.md, admin.md
├── .claude/
│   ├── settings.local.json  # Hook + statusline registrations
│   ├── rules/tai.md         # Session initialization rules
│   └── commands/            # Slash command definitions
└── .git/hooks/
    ├── pre-commit → .tai/hooks/pre-commit.sh
    └── pre-push → .tai/hooks/pre-push.sh
```

## Troubleshooting

### Context bar shows 0%

`jq` is not installed. The statusline parses JSON with `jq` — without it, parsing fails silently and defaults to 0%.

**Fix:** Install jq (`sudo apt install jq` or `brew install jq`), restart Claude session.

### Pre-commit hook crashes

`project.yaml` has empty values with inline comments. Fixed in TAI v2.0.0+.

**Fix:** Pull latest TAI and re-run install.

### Hooks don't fire

`.claude/settings.local.json` is missing or doesn't contain hooks.

**Fix:** Re-run `.tai-upstream/.tai/hooks/install.sh`, restart Claude session.

### "Cannot find package 'yaml'"

`bun install` was not run in `.tai-upstream/`.

**Fix:** `cd .tai-upstream && bun install`

### Statusline shows but never updates

Settings were changed mid-session. Claude Code loads settings at session start.

**Fix:** Restart your Claude session.

### "detached HEAD" when pulling updates

TAI checkout isn't tracking a branch.

**Fix:** `cd .tai-upstream && git checkout main && git pull`

## Origin

TAI is a team-focused fork of PAI (Personal AI Infrastructure). Licensed under MIT.

## License

MIT
