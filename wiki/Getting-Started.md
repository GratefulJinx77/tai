# Getting Started

Set up TAI in your project in about 5 minutes.

## Prerequisites

Install these before running the TAI installer:

| Dependency | Why | Install |
|------------|-----|---------|
| **jq** | Statusline and hooks parse JSON from Claude Code | `sudo apt install jq` (Linux) / `brew install jq` (macOS) |
| **bun** | Runs TypeScript hooks without compilation | [bun.sh](https://bun.sh) |
| **python3** | Install script uses Python for settings merge | Pre-installed on most systems |
| **git** | Version control, hook installation | Pre-installed on most systems |
| **Claude Code** | The AI development tool TAI extends | [claude.ai/code](https://claude.ai/code) |

Verify all dependencies:
```bash
jq --version && bun --version && python3 --version && git --version
```

**If any command fails, install it before proceeding.** The installer will refuse to run with missing dependencies. The most commonly missed dependency is `jq` — without it, the context bar shows 0% and hooks can't parse Claude Code's JSON input.

## Installation

### 1. Clone TAI into your project

```bash
cd /path/to/your-project
git clone https://github.com/GratefulJinx77/tai.git .tai-upstream
```

This creates `.tai-upstream/` containing the TAI framework.

### 2. Install dependencies

```bash
cd .tai-upstream && bun install && cd ..
```

This installs the `yaml` package required by TAI hooks.

### 3. Run the installer

```bash
.tai-upstream/.tai/hooks/install.sh
```

**What it does:**

- Scaffolds `.tai/` instance directories (config, context, memory, roles) — copies templates, never overwrites existing files
- Creates `.claude/settings.local.json` — registers 17 hooks and the statusline with Claude Code
- Creates `.claude/rules/tai.md` — session initialization instructions
- Creates `.claude/commands/*.md` — 5 slash commands (`/tai-validate`, `/tai-admin`, `/tai-sprint`, `/tai-decisions`, `/tai-health`)
- Symlinks git hooks (pre-commit, pre-push) to `.git/hooks/`
- If your project has a CLAUDE.md with >500 bytes of content, creates `.tai/context/.bootstrap-pending` for automatic context extraction on first session

**Install modes:**

```bash
.tai-upstream/.tai/hooks/install.sh              # Required + recommended hooks (default)
.tai-upstream/.tai/hooks/install.sh --minimal     # Required hooks only
.tai-upstream/.tai/hooks/install.sh --all         # All hooks including optional
.tai-upstream/.tai/hooks/install.sh --list        # List all hooks and their tiers
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

The `email` field must match each member's `git config user.email` — this is how TAI identifies who is running the session.

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

Leave commands empty (`""`) to skip them in pre-commit/pre-push hooks.

### 3. Define Boundaries and Patterns

- `.tai/context/boundaries.md` — Forbidden imports, service separation rules
- `.tai/context/patterns.md` — Naming conventions, code patterns, testing conventions

These files are loaded into every Claude Code session to keep AI-generated code consistent with team standards.

## First Session

Launch Claude Code:

```bash
claude
```

The following happens automatically:

1. **Team detection** — `.tai/CORE.md` is loaded via CLAUDE.md and rules
2. **Member identification** — Your `git config user.email` is matched against `team.yaml`
3. **Role context** — Your role file (`.tai/roles/dev.md` by default) is loaded
4. **Memory injection** — The LoadContext hook injects active decisions, learnings, and work state
5. **Project context** — Architecture, boundaries, and patterns are loaded
6. **Status line** — The rich status display renders at the bottom of the terminal:

```
-- | TAI | --------------------------------------------------
LOC: Your City | 09:15 | 72°F Clear
ENV: CC: 2.1.81 | TAI:2.0.0 | Hooks: 17 | Role: dev | Team: My Project
------------------------------------------------------------------------
@ CONTEXT: ⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁ 8%
------------------------------------------------------------------------
<> PWD: my-project | Branch: main | Age: 2m
------------------------------------------------------------------------
o MEMORY: D:0 Decisions | L:0 Learnings | S:0 Signals
------------------------------------------------------------------------
* SPRINT: No active sprint
```

## Verification

After installation, verify everything works:

```bash
# 1. Settings file exists with hooks and statusline
grep -c '"hooks"' .claude/settings.local.json        # → 1
grep -c '"statusLine"' .claude/settings.local.json   # → 1

# 2. Git hooks are linked
ls -la .git/hooks/pre-commit .git/hooks/pre-push     # → symlinks to .tai/hooks/

# 3. Slash commands registered
ls .claude/commands/                                  # → 5 .md files

# 4. Hooks fire
echo '{}' | bun run .tai/hooks/LoadContext.hook.ts 2>&1 | head -3
# → should show "systemMessage"

# 5. Statusline renders with context bar
echo '{"context_window":{"used_percentage":50}}' | bash .tai/hooks/statusline-command.sh 2>&1 | grep "%"
# → should show "CONTEXT: ⛁⛁⛁... 50%"

# 6. Pre-commit works
bash .tai/hooks/pre-commit.sh
# → should pass (or skip unconfigured commands)
```

If step 5 shows 0% instead of 50%, `jq` is not installed. See [[FAQ#context-bar-shows-0]].

## Updating TAI

```bash
cd .tai-upstream && git pull && bun install && cd ..
.tai-upstream/.tai/hooks/install.sh
```

The installer never overwrites instance files (config, context, memory). It only re-registers hooks, slash commands, and rules.

If you hit "detached HEAD" when pulling:
```bash
cd .tai-upstream && git checkout main && git pull
```

## Next Steps

- [[Governance]] — Understand roles and admin mode
- [[Hook System]] — Customize enforcement for your team
- [[Memory System]] — Start recording architectural decisions
- [[Skill Packages]] — Install additional skill packages
- [[FAQ]] — Common questions and troubleshooting
