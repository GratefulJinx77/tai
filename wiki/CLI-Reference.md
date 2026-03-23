# CLI Reference

> **Status: Planned** — The `tai` CLI is not yet built. Use `install.sh` for installation. See [[Getting Started]] for the current setup path.

## Current Tools

### install.sh (available now)

The hook installer at `.tai-upstream/.tai/hooks/install.sh` handles project setup:

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

### Slash Commands (available now)

After installation, these commands work inside Claude Code:

| Command | Description |
|---------|-------------|
| `/tai-validate` | Validate TAI installation — checks all components |
| `/tai-admin` | Switch to Admin mode for system configuration |
| `/tai-sprint` | Show current sprint status and ISC progress |
| `/tai-decisions` | Show active team decisions |
| `/tai-health` | Show project health — hooks, boundaries, test status |

## Planned CLI

The `tai` CLI will provide:

| Command | Purpose |
|---------|---------|
| `tai init` | Interactive project initialization with prompts for team, stack, and context |
| `tai install [package]` | Install skill/agent packages from packages.yaml |
| `tai update` | Update installed packages to latest versions |
| `tai status` | Show packages, hooks, and memory statistics |

**Runtime:** Node.js / Bun | **Framework:** Commander.js | **Language:** TypeScript

Source scaffold exists at `cli/src/` but is not yet functional.

## Related Pages

- [[Getting Started]] — Current installation path via install.sh
- [[Skill Packages]] — Package management (currently manual)
- [[Hook System]] — Hook installation via install.sh
