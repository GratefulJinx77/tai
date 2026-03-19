# TAI Memory System

Team-shared context that persists across all Claude Code sessions. Memory files are loaded at session start by the LoadContext hook and re-injected after context compression by the PostCompact hook.

## Stores

### 1. Decisions (`decisions/`)
Architectural and process decisions the team has made. Each decision is a Markdown file following `TEMPLATE.md`. Active decisions are listed in `INDEX.md` and loaded into every session.

- **Format:** Markdown with YAML frontmatter
- **Loaded:** Active decisions only (status: active)
- **To add:** Copy `TEMPLATE.md`, fill it in, add a one-liner to `INDEX.md`

### 2. Learnings (`learnings/`)
What worked and what didn't, captured automatically by the SessionEnd hook as JSONL entries. Monthly synthesis distills patterns into `summary.md`.

- **Format:** JSONL (one JSON object per line)
- **Schema:**
  ```json
  {
    "timestamp": "2026-03-19T16:00:00Z",
    "what_worked": "Using boundary-scan before commits caught import violations early",
    "what_didnt": "Skipping pre-push tests led to CI failures",
    "tags": ["hooks", "testing", "workflow"],
    "session_context": "Sprint 5 — API refactor"
  }
  ```
- **No individual attribution.** No user names, emails, or personal identifiers.

### 3. State (`state/`)
Ephemeral work state — active sprint, current work items, recent completions. Updated by the PRDSync hook. Raw session state files are gitignored; only `current.md` is committed.

- **Format:** Markdown (`current.md`) and JSON (ephemeral session files)

### 4. Signals (`signals/`)
Team-level AI satisfaction ratings captured over time. Used to track whether AI-assisted workflows are improving or degrading.

- **Format:** JSONL (one JSON object per line)
- **Schema:**
  ```json
  {
    "timestamp": "2026-03-19T16:00:00Z",
    "rating": 7,
    "context": "Code generation quality during API endpoint creation",
    "source": "explicit"
  }
  ```
- **No individual attribution.**

### 5. Failures (`failures/`)
Reserved for capturing failure patterns — build failures, CI breakages, recurring issues. Helps the team identify systemic problems.

- **Format:** JSONL

## Context Loading

### Session Start (LoadContext hook)
At session start, LoadContext reads:
- All active decisions from `decisions/INDEX.md`
- The learnings summary from `learnings/summary.md`
- Current work state from `state/current.md`

### Context Recovery (PostCompact hook)
When Claude Code compresses conversation history, the PostCompact hook re-injects critical memory context so the AI retains awareness of team decisions and current state.

## Monthly Synthesis

Learnings accumulate as raw JSONL entries. Once a month:

1. Review learnings JSONL entries from the past 30 days
2. Identify recurring patterns (things that worked, things that didn't)
3. Update `learnings/summary.md` with the distilled patterns
4. Archive raw JSONL entries older than 30 days to `learnings-archive/`

## Privacy

All memory stores follow a strict no-individual-attribution policy. Entries must never contain user names, emails, or any personally identifiable information. Memory represents team knowledge, not individual activity.
