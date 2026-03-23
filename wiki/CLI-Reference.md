# CLI Reference

## Setup Script

The primary entry point for TAI installation, updates, and reconfiguration:

```bash
# Fresh install (new or existing project)
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash

# Update (pull latest framework, re-register hooks)
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash

# Reconfigure (re-run wizard to update team/project settings)
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash -s -- --reconfigure
```

The setup script auto-detects the current state:

| State | Flags | Behavior |
|-------|-------|----------|
| No `.tai/` directory | (none) | Clone framework, install deps, run interactive wizard |
| `.tai/` exists | (none) | Pull latest framework, re-register hooks/rules/commands |
| `.tai/` exists | `--reconfigure` | Re-run wizard with current values as defaults, rewrite config only |

## tai CLI

The `tai` CLI provides direct access to init and package management. It lives at `cli/src/cli.ts` and runs via bun.

### tai init

Interactive project initialization.

```bash
bun run .tai-upstream/cli/src/cli.ts init           # Fresh install
bun run .tai-upstream/cli/src/cli.ts init --force    # Overwrite existing .tai/
bun run .tai-upstream/cli/src/cli.ts init --reconfigure  # Update config only
```

**Wizard prompts:**

| Section | Fields |
|---------|--------|
| **Team** | Team name, your name, email, GitHub username, city, state |
| **Project** | Project name, description, language, framework, database, test runner, linter |
| **Commands** | Build, test, lint, type-check, dev server |

Auto-detects values from `git config`, `package.json`, `tsconfig.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Gemfile`.

**Flags:**

| Flag | Description |
|------|-------------|
| `-f, --force` | Overwrite existing `.tai/` directory (full re-init) |
| `-r, --reconfigure` | Re-run prompts and rewrite `team.yaml` + `project.yaml` only. Hooks, memory, context templates untouched. |

**`--reconfigure` behavior:**
- Reads existing `team.yaml` and `project.yaml` values as defaults
- All prompts shown — hit enter to keep current value, type to change
- Only `team.yaml` and `project.yaml` are rewritten
- `install.sh` is NOT re-run (hooks stay as-is)

### tai install

Install skill/agent packages from `packages.yaml`.

```bash
bun run .tai-upstream/cli/src/cli.ts install           # Install default packages
bun run .tai-upstream/cli/src/cli.ts install --all      # Install all packages
bun run .tai-upstream/cli/src/cli.ts install research   # Install specific package
```

### tai update

Update installed packages to latest version.

```bash
bun run .tai-upstream/cli/src/cli.ts update
```

### tai status

Show installed packages, hooks, and memory statistics.

```bash
bun run .tai-upstream/cli/src/cli.ts status
```

## install.sh

The hook installer at `.tai/hooks/install.sh` handles hook registration independently of the CLI:

```bash
.tai-upstream/.tai/hooks/install.sh              # Required + recommended hooks
.tai-upstream/.tai/hooks/install.sh --minimal     # Required hooks only
.tai-upstream/.tai/hooks/install.sh --all         # All hooks including optional
.tai-upstream/.tai/hooks/install.sh --list        # List all hooks and tiers
```

**What it does:**
- Scaffolds `.tai/` instance directories (config, context, memory, roles)
- Creates `.claude/settings.local.json` with hook + statusline registrations
- Creates `.claude/rules/tai.md` with session initialization rules
- Creates `.claude/commands/*.md` with 5 slash commands
- Symlinks git hooks (pre-commit, pre-push)

## Slash Commands

After installation, these commands work inside Claude Code:

| Command | Description |
|---------|-------------|
| `/tai-validate` | Validate TAI installation — checks all components |
| `/tai-admin` | Switch to Admin mode for system configuration |
| `/tai-sprint` | Show current sprint status and ISC progress |
| `/tai-decisions` | Show active team decisions |
| `/tai-health` | Show project health — hooks, boundaries, test status |

## Related Pages

- [[Getting Started]] — Installation walkthrough
- [[Skill Packages]] — Package management
- [[Hook System]] — Hook installation and tiers
