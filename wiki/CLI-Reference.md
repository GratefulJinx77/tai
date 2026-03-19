# CLI Reference

The TAI CLI provides four commands for project initialization, package management, and status reporting.

## Installation

```bash
# Global install
npm install -g @tai/cli

# Or use without installing
npx @tai/cli <command>
```

## Commands

### `tai init`

Scaffold the `.tai/` directory in the current project.

```bash
tai init
tai init --force    # Overwrite existing .tai/ directory
```

**What it creates:**
- `.tai/CORE.md` -- Session initialization protocol
- `.tai/VERSION` -- Set to 2.0.0
- `.tai/CONTEXT_ROUTING.md` -- Topic-to-file mapping
- `.tai/PRDFORMAT.md` -- Work tracking format specification
- `.tai/status-line.md` -- Status display specification
- `.tai/packages.yaml` -- Package registry
- `.tai/config/` -- Template config files (team.yaml, project.yaml, models.yaml)
- `.tai/context/` -- Placeholder context files (architecture.md, boundaries.md, patterns.md, sprint-current.md)
- `.tai/hooks/` -- Hook scripts, config.yaml, install.sh, settings-template.json, lib/
- `.tai/roles/` -- Role context files (dev.md, qa.md, pub.md, admin.md)
- `.tai/skills/` -- Skill package directories
- `.tai/agents/` -- Agent directories (core/, research/, security/, creative/, execution/, ops/, custom/)
- `.tai/memory/` -- Memory stores (decisions/, learnings/, state/, signals/, failures/)
- `.tai/agent-memory/` -- Per-agent persistent memory
- `.tai/telemetry/` -- JSONL log directory
- `.tai/templates/` -- PR description, sprint ISC, boundary examples

**Options:**

| Flag | Description |
|------|-------------|
| `-f, --force` | Overwrite existing `.tai/` directory |

### `tai install [package]`

Install skill and agent packages from `packages.yaml`.

```bash
# Install all required + recommended packages (default)
tai install

# Install a specific package
tai install security
tai install media

# Install all packages (required + recommended + optional)
tai install --all
```

**Behavior:**
- Without arguments: installs all `required` and `recommended` tier packages
- With a package name: installs that specific package regardless of tier
- With `--all`: installs every package in `packages.yaml`

**Options:**

| Flag | Description |
|------|-------------|
| `-a, --all` | Install all packages including optional tier |

### `tai update`

Update installed packages to their latest versions.

```bash
tai update
```

Checks each installed package against the registry and updates to the latest version defined in `packages.yaml`.

### `tai status`

Show installed packages, active hooks, and memory statistics.

```bash
tai status
```

**Output includes:**
- Installed skill packages with versions and tiers
- Installed agent packages with versions and tiers
- Active hooks count by tier (required, recommended, optional)
- Memory statistics:
  - Decision count (files in `memory/decisions/`)
  - Learning entry count
  - Signal count (files in `memory/signals/`)

## Configuration

The CLI reads configuration from:
1. `.tai/packages.yaml` -- Package registry
2. `.tai/hooks/config.yaml` -- Hook definitions
3. `.tai/config/team.yaml` -- Team configuration
4. `.tai/config/project.yaml` -- Project configuration
5. `.tai/VERSION` -- Current TAI version

All paths are relative to the project root (the directory containing `.tai/`).

## Technical Details

The CLI is built with:
- **Runtime:** Node.js / Bun
- **Framework:** Commander.js
- **Language:** TypeScript
- **Entry point:** `cli/src/cli.ts`

```typescript
import { Command } from "commander";
import { init } from "./commands/init.js";
import { install } from "./commands/install.js";
import { update } from "./commands/update.js";
import { status } from "./commands/status.js";
```

## Related Pages

- [[Getting Started]] -- Using the CLI for initial setup
- [[Skill Packages]] -- What `tai install` installs
- [[Hook System]] -- Hook installation via `install.sh` (separate from CLI)
