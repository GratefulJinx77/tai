# Agent Memory

Per-agent memory that persists across sessions. Automatically scaffolded by SubagentStop hook.

## How It Works

When a custom agent completes (via SubagentStop hook), a MEMORY.md file is created at:
`agent-memory/{agent-name}/MEMORY.md`

This file accumulates context across sessions — patterns learned, preferences discovered,
common issues encountered. The agent can read its own MEMORY.md at session start.

## Directory Structure

```
agent-memory/
├── README.md (this file)
├── Engineer/
│   └── MEMORY.md
├── Architect/
│   └── MEMORY.md
└── {agent-name}/
    └── MEMORY.md
```

Ephemeral agent types (Explore, Plan, general-purpose) do not get memory files.
