# TAI — Team AI Infrastructure

A team alignment tool for AI-assisted development. TAI gives every team member a shared brain: consistent context, shared memory, and team conventions — loaded automatically at every session start.

TAI is not enforcement or surveillance. It is shared context that keeps the team aligned.

## How It Works

When Claude Code starts in a TAI-enabled project, `.tai/CORE.md` activates:
1. Identifies the team member via git email
2. Loads role context (Dev, QA, Pub, or Admin)
3. Loads team memory (decisions, learnings, current work state)
4. Loads project context (architecture, boundaries, patterns)
5. Verifies hooks are installed
6. Displays status line

See `.tai/CORE.md` for the full session initialization protocol.

## Structure

```
.tai/
├── CORE.md              # Session initialization protocol
├── VERSION              # 2.0.0
├── CONTEXT_ROUTING.md   # Topic-to-file mapping
├── PRDFORMAT.md         # Work tracking format (ISC criteria)
├── status-line.md       # Rich status display spec
├── config/              # team.yaml, project.yaml, models.yaml
├── context/             # architecture.md, boundaries.md, patterns.md, sprint-current.md
├── hooks/               # Enforcement hooks + config.yaml
├── roles/               # dev.md, qa.md, pub.md, admin.md
├── skills/              # Workflow definitions (core/, development/, quality/, ...)
├── agents/              # AI agents (core/, research/, security/, ...)
├── memory/              # Shared team memory (decisions/, learnings/, state/, signals/, failures/)
├── agent-memory/        # Agent-specific memory
├── packages.yaml        # Skill/agent package registry
├── telemetry/           # JSONL logs
└── templates/           # PR description, sprint ISC, boundary examples
```

See `.tai/CONTEXT_ROUTING.md` for topic-to-file mapping.
