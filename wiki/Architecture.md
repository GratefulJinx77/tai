# Architecture

How TAI's components fit together -- hook lifecycle, memory flow, package system, and directory structure.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code Session                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  CLAUDE   │───>│  CORE.md  │───>│  Role    │───>│  Context  │  │
│  │   .md     │    │  Protocol │    │  Context │    │  Files   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                         │                                         │
│                         v                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Hook System                            │   │
│  │  SessionStart ──> PreToolUse ──> PostToolUse ──> Stop     │   │
│  │  PreCompact ──> PostCompact                                │   │
│  │  UserPromptSubmit ──> SessionEnd ──> SubagentStop         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         v                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Memory   │    │  Skills   │    │  Agents  │                  │
│  │  System   │    │  System   │    │  System  │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Hook Lifecycle

### Session Start

```
Claude Code launches
       │
       v
  CLAUDE.md loads .tai/CORE.md
       │
       v
  SessionStart event fires
       │
       v
  LoadContext hook executes:
    - Read team.yaml → identify member by git email
    - Load role context (roles/{role}.md)
    - Inject decisions (memory/decisions/INDEX.md)
    - Inject learnings summary (memory/learnings/summary.md)
    - Inject work state (memory/state/current.md)
    - Load project context (context/architecture.md, boundaries.md, patterns.md)
    - Render status line
       │
       v
  Session ready
```

### Tool Use Cycle

```
User prompt submitted
       │
       v
  UserPromptSubmit hooks fire
  (UpdateTabTitle, RatingCapture, SessionAutoName)
       │
       v
  AI generates tool call
       │
       v
  PreToolUse hooks fire
  (SecurityValidator, AgentExecutionGuard)
       │
       ├── Allow → tool executes
       ├── Deny → tool blocked with reason
       └── Ask → user prompted for decision
       │
       v
  PostToolUse hooks fire
  (PRDSync, SprintComplete, DeployVerify, TAIConfigValidation, TAIBuildCLAUDE)
       │
       v
  AI continues or stops
       │
       v
  Stop hooks fire
  (AlgorithmGuard, DocIntegrity, TAIDocIntegrity)
```

### Context Compaction

```
Context window approaching limit
       │
       v
  PreCompact hook fires:
    - Snapshot critical state
    - Save active decisions
    - Save current work state
    - Save sprint criteria
       │
       v
  Claude Code compresses conversation
       │
       v
  PostCompact hook fires:
    - Re-inject decisions from INDEX.md
    - Re-inject work state from current.md
    - Re-inject active sprint ISC
       │
       v
  Session continues with critical context preserved
```

### Session End

```
Session terminating
       │
       v
  SessionEnd hooks fire:
    - WorkCompletionLearning: capture session learnings (JSONL, no attribution)
    - SessionCleanup: mark work complete, clear state, reset tab
    - IntegrityCheck: detect system file changes
    - UpdateCounts: refresh system counts
    - TAIIntegrityCheck: validate .tai/ structure
    - TAIUpdateCounts: collect TAI metrics
```

## Memory Flow

```
                    ┌─────────────────┐
                    │   Git Repository  │
                    │   (committed)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              v              v              v
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Decisions │  │ Learnings│  │   State  │
        │ INDEX.md  │  │summary.md│  │current.md│
        └─────┬────┘  └────┬─────┘  └────┬─────┘
              │             │             │
              └──────────────┼──────────────┘
                             │
                    ┌────────v────────┐
                    │  LoadContext     │
                    │  (SessionStart)  │
                    └────────┬────────┘
                             │
                    ┌────────v────────┐
                    │  AI Session     │
                    │  (work happens) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              v              v              v
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ PRDSync   │  │ Learning │  │ Rating   │
        │ (state)   │  │ Capture  │  │ Capture  │
        └──────────┘  └──────────┘  └──────────┘
```

**Write path:** Hooks capture memory during and after sessions.
**Read path:** LoadContext injects memory at session start; PostCompact re-injects after compaction.

## Package System

```
packages.yaml
       │
       ├── skills:
       │     ├── core (required)          → skills/core/
       │     ├── thinking (required)      → skills/thinking/
       │     ├── research (required)      → skills/research/
       │     ├── agents (required)        → skills/agents/
       │     ├── security (recommended)   → skills/security/
       │     ├── utilities (recommended)  → skills/utilities/
       │     ├── project-audit (recommended) → skills/project-audit/
       │     ├── media (optional)         → skills/media/
       │     ├── content-analysis (optional) → skills/content-analysis/
       │     └── scraping (optional)      → skills/scraping/
       │
       └── agents:
             ├── core (required)          → agents/core/
             ├── research (recommended)   → agents/research/
             ├── execution (required)     → agents/execution/
             ├── ops (recommended)        → agents/ops/
             ├── security (optional)      → agents/security/
             └── creative (optional)      → agents/creative/
```

## Full Directory Structure

```
.tai/
├── CORE.md                    # Session initialization protocol
├── VERSION                    # Semantic version (2.0.0)
├── CONTEXT_ROUTING.md         # Topic → file path mapping
├── PRDFORMAT.md               # PRD format specification (ISC criteria)
├── status-line.md             # Status display specification
├── packages.yaml              # Skill + agent package registry
│
├── config/
│   ├── team.yaml              # Team members, roles, admin_users, notifications
│   ├── project.yaml           # Stack, commands, project metadata
│   └── models.yaml            # AI model configuration per task type
│
├── context/
│   ├── architecture.md        # System architecture documentation
│   ├── boundaries.md          # Forbidden imports, service separation
│   ├── patterns.md            # Code conventions with examples
│   └── sprint-current.md      # Active sprint, ISC criteria
│
├── hooks/
│   ├── config.yaml            # Hook registry (27 hooks, tiers, events)
│   ├── install.sh             # Git hook installer (--minimal/--all/--list)
│   ├── settings-template.json # Claude Code settings.json template
│   ├── lib/                   # Shared hook utilities
│   ├── *.hook.ts              # TypeScript hook implementations
│   └── *.sh                   # Shell hook scripts (pre-commit, pre-push)
│
├── roles/
│   ├── dev.md                 # Default role context
│   ├── qa.md                  # Quality-focused context
│   ├── pub.md                 # Public-facing content context
│   └── admin.md               # TAI configuration context
│
├── skills/
│   ├── core/                  # Development, quality, architecture, project, query
│   ├── thinking/              # First principles, council, red team, brainstorm
│   ├── research/              # Multi-agent research, extraction, web search
│   ├── security/              # Recon, web assessment, prompt injection
│   ├── agents/                # Agent composition, spawning, traits
│   ├── media/                 # Art, diagrams, mermaid, video
│   ├── content-analysis/      # Video/podcast/article analysis
│   ├── scraping/              # Bright Data, Apify
│   ├── utilities/             # CLI, browser, documents, Fabric, evals
│   ├── project-audit/         # Parallel agent accuracy audit
│   └── custom/                # Team-specific skills (auto-discovered)
│
├── agents/
│   ├── core/                  # Engineer, Architect, Designer, QATester, BrowserAgent, UIReviewer, visual-analyst
│   ├── research/              # ClaudeResearcher, CodexResearcher, GeminiResearcher, GrokResearcher, PerplexityResearcher
│   ├── security/              # Pentester
│   ├── creative/              # Artist
│   ├── execution/             # Algorithm
│   ├── ops/                   # session-closer
│   └── custom/                # Team-specific agents (auto-discovered)
│
├── memory/
│   ├── decisions/             # Architectural decisions + INDEX.md + TEMPLATE.md
│   ├── learnings/             # JSONL entries + summary.md
│   ├── state/                 # current.md + work/{slug}/PRD.md
│   ├── signals/               # Satisfaction ratings (JSONL)
│   └── failures/              # Failure context dumps (JSONL)
│
├── agent-memory/              # Per-agent persistent memory ({AgentName}/MEMORY.md)
├── telemetry/                 # JSONL logs (sessions, hooks, boundaries, ai-usage)
└── templates/                 # PR description, sprint ISC, boundary examples
```

## Design Principles

1. **Alignment over enforcement** -- Context shaping, not access gating. Roles change what the AI sees, not what it can do.

2. **Memory is paramount** -- Every session starts with full team context. Decisions, learnings, and work state are always available.

3. **Git is the infrastructure** -- Memory stores are committed to git. No external database, no cloud service. Clone the repo, get the memory.

4. **Convention over configuration** -- Sensible defaults with three tiers (required, recommended, optional). Works out of the box, customizable when needed.

5. **No attribution** -- Learnings, signals, and failures are team-level, not individual. This encourages honest capture without blame.

6. **Context recovery** -- PreCompact/PostCompact hooks ensure critical state survives context compression. Long sessions don't lose team context.

## Related Pages

- [[Hook System]] -- Detailed hook reference
- [[Memory System]] -- Memory store details
- [[Skill Packages]] -- Package system details
- [[Agents]] -- Agent system details
