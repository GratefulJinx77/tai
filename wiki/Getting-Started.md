# Getting Started

Set up TAI in your project in about 2 minutes.

## Prerequisites

Install these before running the TAI setup:

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

**If any command fails, install it before proceeding.** The setup script checks for missing dependencies and tells you what's missing. The most commonly missed dependency is `jq` — without it, the context bar shows 0% and hooks can't parse Claude Code's JSON input.

## Installation

One command — works for both new and existing projects:

```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
```

**What it does:**

1. Checks prerequisites (git, bun, jq, python3)
2. Runs `git init` if you're not in a git repo yet
3. Clones the TAI framework into `.tai-upstream/`
4. Installs dependencies
5. Launches an interactive wizard that prompts for:
   - **Team:** name, your name, email, GitHub username, city, state
   - **Project:** name, description, language, framework, database, test runner, linter
   - **Commands:** build, test, lint, type-check, dev server

The wizard auto-detects values from `git config`, `package.json`, `tsconfig.json`, `go.mod`, etc. Hit enter to accept defaults.

After the wizard completes, it:
- Creates `.tai/` with config, context templates, memory stores, and roles
- Creates `.claude/settings.local.json` with hooks and statusline registered
- Creates `.claude/rules/tai.md` and `.claude/commands/*.md` (5 slash commands)
- Symlinks git hooks (pre-commit, pre-push) to `.git/hooks/`
- If your project has an existing CLAUDE.md with >500 bytes, creates `.bootstrap-pending` for automatic context extraction on first session

## First-Time Setup

### Define Boundaries and Patterns

After installation, populate these context files:

- `.tai/context/boundaries.md` — Forbidden imports, service separation rules
- `.tai/context/patterns.md` — Naming conventions, code patterns, testing conventions

These files are loaded into every Claude Code session to keep AI-generated code consistent with team standards.

### Add More Team Members

Edit `.tai/config/team.yaml` to add additional team members:

```yaml
team:
  name: "My Project"
  admin_users: ["alice@company.com"]
  members:
    - name: "Alice"
      email: "alice@company.com"
      github: "alice-gh"
      default_role: dev
      location:
        city: "Seattle"
        state: "WA"
    - name: "Bob"
      email: "bob@company.com"
      github: "bob-gh"
      default_role: qa
      location:
        city: "Austin"
        state: "TX"
  notifications:
    platform: "slack"
    webhook_url: ""
    channel: ""
```

The `email` field must match each member's `git config user.email` — this is how TAI identifies who is running the session.

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

Run the same setup command again:

```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
```

It auto-detects the existing `.tai/` directory and updates the framework and hooks without touching your config, context, or memory files.

## Reconfiguring TAI

Need to update team name, city, project stack, or other settings?

```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash -s -- --reconfigure
```

This re-runs the interactive wizard with your current values pre-filled as defaults. Only `team.yaml` and `project.yaml` are rewritten — hooks, memory, and everything else stay untouched.

## Summary of Commands

| What | Command |
|------|---------|
| **Fresh install** | `curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh \| bash` |
| **Update** | Same command — auto-detects existing install |
| **Reconfigure** | `curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh \| bash -s -- --reconfigure` |

## Next Steps

- [[Governance]] — Understand roles and admin mode
- [[Hook System]] — Customize enforcement for your team
- [[Memory System]] — Start recording architectural decisions
- [[Skill Packages]] — Install additional skill packages
- [[FAQ]] — Common questions and troubleshooting
