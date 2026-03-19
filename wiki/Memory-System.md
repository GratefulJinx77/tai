# Memory System

Team-shared context that persists across all Claude Code sessions. Memory files are committed to git -- no external infrastructure required.

## Overview

TAI maintains five shared memory stores. At session start, the LoadContext hook injects active decisions, synthesized learnings, and current work state into the AI's context. If context is compressed mid-session, the PostCompact hook re-injects critical memory automatically.

All memory stores follow a strict **no-individual-attribution policy**. Entries never contain user names, emails, or personally identifiable information. Memory represents team knowledge, not individual activity.

## Five Stores

| Store | Purpose | Loaded At | Format |
|-------|---------|-----------|--------|
| **Decisions** | Why we chose X over Y | Every session start | Markdown with YAML frontmatter |
| **Learnings** | What worked, what didn't | Every session start (summary) | JSONL |
| **State** | Active sprint, work items | Every session start | Markdown + JSON |
| **Signals** | Team satisfaction with AI quality | On demand | JSONL |
| **Failures** | Context dumps from bad sessions | On demand | JSONL |

## Decisions (`memory/decisions/`)

Architectural and process decisions the team has made. Each decision is a Markdown file. Active decisions are listed in `INDEX.md` and loaded into every session.

### Format

```markdown
<!-- memory/decisions/001-chose-postgres.md -->
# Chose PostgreSQL over MongoDB

**Date:** 2026-03-01
**Context:** Need relational queries for financial data
**Decision:** PostgreSQL with pg-boss for job queues
**Alternatives:** MongoDB (rejected: no joins), SQLite (rejected: no concurrent writes)
```

A `TEMPLATE.md` is provided for new decisions.

### INDEX.md

The index lists all active decisions with one-line summaries. Only decisions with `status: active` are loaded at session start.

### Adding a Decision

1. Copy `TEMPLATE.md` to a new file (e.g., `002-api-framework.md`)
2. Fill in the decision details
3. Add a one-liner to `INDEX.md`
4. Commit to git

### Active vs Superseded

Decisions can be marked as superseded when they are replaced by a newer decision. Superseded decisions are kept for historical context but not loaded at session start.

## Learnings (`memory/learnings/`)

What worked and what didn't, captured automatically by the WorkCompletionLearning hook at SessionEnd. Each entry is a line in a JSONL file.

### Schema

```json
{
  "timestamp": "2026-03-19T16:00:00Z",
  "what_worked": "Using boundary-scan before commits caught import violations early",
  "what_didnt": "Skipping pre-push tests led to CI failures",
  "tags": ["hooks", "testing", "workflow"],
  "session_context": "Sprint 5 -- API refactor"
}
```

**No individual attribution.** No user names, emails, or personal identifiers.

### summary.md

The `summary.md` file contains synthesized patterns distilled from raw learnings. This is the file loaded at every session start -- not the raw JSONL entries.

## State (`memory/state/`)

Ephemeral work state -- active sprint, current work items, recent completions.

### current.md

The primary state file, committed to git and loaded at every session start. Contains:
- Active sprint name and progress
- Current work items
- Recent completions

### Work Directory

Individual work items are tracked as PRD files under `memory/state/work/{slug}/PRD.md`. The PRDSync hook updates state when PRD frontmatter changes. See the PRD format specification at `.tai/PRDFORMAT.md`.

### Session Files

Raw session state files (JSON) are gitignored -- only `current.md` is committed.

## Signals (`memory/signals/`)

Team-level AI satisfaction ratings captured over time. Used to track whether AI-assisted workflows are improving or degrading.

### Schema

```json
{
  "timestamp": "2026-03-19T16:00:00Z",
  "rating": 7,
  "context": "Code generation quality during API endpoint creation",
  "source": "explicit"
}
```

**No individual attribution.**

Signals are captured by the RatingCapture hook (optional tier) and stored as JSONL entries.

## Failures (`memory/failures/`)

Reserved for capturing failure patterns -- build failures, CI breakages, recurring issues. Helps the team identify systemic problems.

Stored as JSONL entries with context about what went wrong.

## Context Loading

### Session Start (LoadContext Hook)

At session start, the LoadContext hook reads and injects:
- All active decisions from `decisions/INDEX.md`
- The learnings summary from `learnings/summary.md`
- Current work state from `state/current.md`

This ensures every session starts with full team context regardless of which team member is working.

### Context Recovery (PostCompact Hook)

When Claude Code compresses conversation history mid-session, the PostCompact hook re-injects:
- Active decisions from `decisions/INDEX.md`
- Current work state from `state/current.md`
- Active sprint ISC criteria

This prevents context loss during long sessions.

## Monthly Synthesis

Learnings accumulate as raw JSONL entries. Once a month:

1. Review learnings JSONL entries from the past 30 days
2. Identify recurring patterns (things that worked, things that didn't)
3. Update `learnings/summary.md` with the distilled patterns
4. Archive raw JSONL entries older than 30 days to `learnings-archive/`

## Privacy

All memory stores follow a strict no-individual-attribution policy:
- Entries must never contain user names, emails, or any PII
- Memory represents team knowledge, not individual activity
- Hook status is logged without individual attribution
- Bypass reasons are recorded but not attributed to specific users

## Related Pages

- [[Hook System]] -- Hooks that manage memory (LoadContext, PostCompact, WorkCompletionLearning)
- [[Architecture]] -- Memory flow in the broader system
- [[Getting Started]] -- Setting up memory stores
