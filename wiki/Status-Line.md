# Status Line

TAI displays a rich multi-segment status line at session start, giving you an at-a-glance view of your environment, context usage, project state, memory, and sprint progress.

## Format

```
── | TAI STATUSLINE | ──────────────────────────
ENV: CC: {version} | TAI:{version} | SK: {count} | Hooks: {count}
────────────────────────────────────────────────
* CONTEXT: {context window usage bar}
────────────────────────────────────────────────
+ PWD: {project} | Branch: {branch} | Role: {role}
────────────────────────────────────────────────
@ MEMORY: {n} Decisions | {n} Learnings | {n} Signals
────────────────────────────────────────────────
# SPRINT: {name} | {n}/{m} ISC | {status}
────────────────────────────────────────────────
```

## Five Segments

### 1. ENV

Environment information about the current session.

| Field | Source | Description |
|-------|--------|-------------|
| CC | `claude --version` | Claude Code version |
| TAI | `.tai/VERSION` | TAI version (currently 2.0.0) |
| SK | `packages.yaml` | Count of installed skill packages |
| Hooks | `hooks/config.yaml` | Count of active hooks |

### 2. CONTEXT

Visual representation of context window usage.

```
* CONTEXT: [====------]
```

- Displays an approximate usage percentage as a visual bar
- Source: Claude Code context window usage (estimated)

### 3. PWD

Current project and session context.

| Field | Source | Description |
|-------|--------|-------------|
| project | `config/project.yaml` or directory name | Current project name |
| Branch | `git branch --show-current` | Current git branch |
| Role | Session role detection | DEV, QA, PUB, or ADMIN |

### 4. MEMORY

Memory store statistics.

| Field | Source | Description |
|-------|--------|-------------|
| Decisions | `memory/decisions/` | Count of decision files (excluding INDEX.md) |
| Learnings | `memory/learnings/summary.md` | Count of synthesized learning entries |
| Signals | `memory/signals/` | Count of signal files |

### 5. SPRINT

Active sprint progress.

| Field | Source | Description |
|-------|--------|-------------|
| name | `context/sprint-current.md` | Sprint name from first `# ` heading |
| n/m ISC | Sprint criteria | Checked (`- [x]`) vs total criteria count |
| status | Calculated | GREEN (>75%), YELLOW (25-75%), RED (<25%) |

## Refresh Triggers

The status line is re-rendered after:

1. Hook execution completes
2. Skill invocation completes
3. Memory write (any store update)
4. Manual request via `/tai-health`

## Empty State

On first session with no data:

```
── | TAI STATUSLINE | ──────────────────────────
ENV: CC: -- | TAI:2.0.0 | SK: 0 | Hooks: 0
────────────────────────────────────────────────
* CONTEXT: [----------]
────────────────────────────────────────────────
+ PWD: my-project | Branch: main | Role: DEV
────────────────────────────────────────────────
@ MEMORY: 0 Decisions | 0 Learnings | 0 Signals
────────────────────────────────────────────────
# SPRINT: No active sprint | 0/0 ISC | --
────────────────────────────────────────────────
```

## Customization

The status line specification is defined in `.tai/status-line.md`. To customize:

- Modify segment sources or display format in the specification
- The LoadContext hook renders the status line at session start
- Additional segments can be added by extending the specification

## Related Pages

- [[Getting Started]] -- What you see on first launch
- [[Architecture]] -- Status line in the broader system
- [[Hook System]] -- Hooks that trigger status line refresh
