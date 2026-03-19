# TAI Status Line Specification

Rich multi-segment display rendered after session initialization and refreshed during the session.

## Format

```
── | TAI STATUSLINE | ──────────────────────────
ENV: CC: {version} | TAI:{version} | SK: {count} | Hooks: {count}
────────────────────────────────────────────────
* CONTEXT: {bar showing context window usage}
────────────────────────────────────────────────
+ PWD: {project} | Branch: {branch} | Role: {role}
────────────────────────────────────────────────
@ MEMORY: {decisions} Decisions | {learnings} Learnings | {signals} Signals
────────────────────────────────────────────────
# SPRINT: {name} | {n}/{m} ISC | {status}
────────────────────────────────────────────────
```

## Segments

### 1. ENV
- **CC**: Claude Code version from `claude --version`
- **TAI**: Version from `.tai/VERSION`
- **SK**: Count of installed skill packages (from packages.yaml)
- **Hooks**: Count of active hooks (from hooks/config.yaml)

### 2. CONTEXT
- **Source**: Claude Code context window usage (estimated)
- **Display**: Visual bar `[====------]` showing approximate usage percentage

### 3. PWD
- **project**: Current project name from config/project.yaml or directory name
- **Branch**: Current git branch from `git branch --show-current`
- **Role**: Current role (DEV, QA, PUB, or ADMIN)

### 4. MEMORY
- **Decisions**: Count of files in memory/decisions/ (excluding INDEX.md)
- **Learnings**: Count of entries in memory/learnings/summary.md
- **Signals**: Count of files in memory/signals/

### 5. SPRINT
- **Source**: `.tai/context/sprint-current.md`
- **name**: Sprint name from first `# ` heading
- **n/m ISC**: Checked `- [x]` vs total criteria count
- **status**: GREEN (>75%), YELLOW (25-75%), RED (<25%)

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
