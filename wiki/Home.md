# TAI -- Team AI Infrastructure

**Version 2.0.0** | A shared brain for AI-assisted development teams.

TAI loads consistent context, shared memory, and team conventions into every Claude Code session automatically. It is not enforcement or surveillance -- it is alignment. Every team member gets the same architecture context, the same boundaries, the same patterns, and a shared memory of why decisions were made.

## Core Value Proposition

**Alignment over enforcement.** TAI shapes AI behavior through shared context, not access restrictions. Every team member can use every skill. Roles load different context to focus the AI on different workflows.

**Memory is paramount.** Architectural decisions, learnings, and work state persist across all sessions. When Claude Code starts, it already knows what the team decided, what worked, what didn't, and what's in progress.

## Key Features

| Feature | Description |
|---------|-------------|
| **Shared Memory** | 5 persistent stores: decisions, learnings, state, signals, failures |
| **Flat Governance** | 4 roles (Dev, QA, Pub, Admin) that shape context, not restrict access |
| **Hook System** | 27 hooks across 3 tiers enforcing team conventions at key checkpoints |
| **Skill Packages** | 10 packages with development, research, security, and utility workflows |
| **Agent Library** | 16 agents across 6 groups for specialized tasks |
| **Context Recovery** | Automatic re-injection of critical state after context compaction |
| **Status Line** | Rich 5-segment terminal display showing environment, memory, and sprint state |
| **Slash Commands** | `/tai-validate`, `/tai-admin`, `/tai-sprint`, `/tai-decisions`, `/tai-health` |

## How It Works

When Claude Code starts in a TAI-enabled project:

1. Detects `.tai/` directory in project root
2. Identifies the team member via git email match against `team.yaml`
3. Loads role context (Dev, QA, Pub, or Admin)
4. Loads team memory (decisions, learnings, current work state)
5. Loads project context (architecture, boundaries, patterns)
6. Verifies hooks are installed
7. Displays the status line

## Quick Links

- [[Getting Started]] -- Install TAI and run your first session
- [[Governance]] -- Roles, admin mode, team configuration
- [[Hook System]] -- Enforcement hooks, tiers, and customization
- [[Memory System]] -- Shared context across all sessions
- [[Skill Packages]] -- Workflow definitions and package management
- [[Agents]] -- 16 agents across 6 groups
- [[CLI Reference]] -- Slash commands and verification
- [[Status Line]] -- Rich terminal status display
- [[Migration Guide]] -- Bring TAI into an existing project
- [[Architecture]] -- System design and lifecycle diagrams
- [[FAQ]] -- Common questions and troubleshooting

## Directory Structure

```
.tai/
├── CORE.md              # Session initialization protocol
├── VERSION              # 2.0.0
├── CONTEXT_ROUTING.md   # Topic-to-file mapping
├── PRDFORMAT.md         # Work tracking format (ISC criteria)
├── status-line.md       # Rich status display spec
├── packages.yaml        # Skill/agent package registry
├── config/              # team.yaml, project.yaml, models.yaml
├── context/             # architecture.md, boundaries.md, patterns.md, sprint-current.md
├── hooks/               # Enforcement hooks + config.yaml + settings-template.json
├── roles/               # dev.md, qa.md, pub.md, admin.md
├── skills/              # Workflow definitions (core/, thinking/, research/, ...)
├── agents/              # AI agents (core/, research/, security/, creative/, execution/, ops/)
├── memory/              # Shared team memory (decisions/, learnings/, state/, signals/, failures/)
├── agent-memory/        # Per-agent persistent memory
├── telemetry/           # JSONL logs (sessions, hooks, boundaries)
└── templates/           # PR description, sprint ISC, boundary examples
```

## Origin

TAI is a team-focused fork of [PAI](https://github.com/GratefulJinx77/tai) (Personal AI Infrastructure). Licensed under MIT.
