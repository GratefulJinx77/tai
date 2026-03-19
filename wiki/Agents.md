# Agents

TAI includes 16 agents organized into 6 groups. Agents are specialized AI personas with defined roles, tools, and behavioral directives.

## Overview

Agents live in `.tai/agents/{group}/` directories. Each agent is a markdown file with YAML frontmatter defining its configuration and a body describing its personality, expertise, and operating procedures.

Agents are registered as packages in `.tai/packages.yaml` alongside skill packages.

## 6 Groups, 16 Agents

### Core Agents (7) -- Required

The foundational development team.

| Agent | Description | Model |
|-------|-------------|-------|
| **Engineer** | Elite principal engineer. TDD, strategic planning, constitutional principles. Character: "Webb" -- battle-scarred leader with 15 years of experience. | Opus |
| **Architect** | System architecture and design decisions. Strategic long-term thinking. | Opus |
| **Designer** | UX/UI design review and recommendations. | Opus |
| **QATester** | Quality assurance and test strategy. | Opus |
| **BrowserAgent** | Browser automation for visual validation. | Opus |
| **UIReviewer** | UI-specific code and design review. | Opus |
| **visual-analyst** | Visual analysis and comparison of UI elements. | Opus |

### Research Agents (5) -- Recommended

Multi-model research capabilities.

| Agent | Description |
|-------|-------------|
| **ClaudeResearcher** | Research via Claude models |
| **CodexResearcher** | Research via OpenAI Codex |
| **GeminiResearcher** | Research via Google Gemini |
| **GrokResearcher** | Research via xAI Grok |
| **PerplexityResearcher** | Research via Perplexity |

### Security (1) -- Optional

| Agent | Description |
|-------|-------------|
| **Pentester** | Security testing and vulnerability analysis |

### Creative (1) -- Optional

| Agent | Description |
|-------|-------------|
| **Artist** | Art generation and creative visual work |

### Execution (1) -- Required

| Agent | Description | Model |
|-------|-------------|-------|
| **Algorithm** | The 7-phase execution methodology agent. Character: "Vera Sterling" -- formal methods researcher. ISC expert who manages Ideal State Criteria through OBSERVE-THINK-PLAN-BUILD-EXECUTE-VERIFY-LEARN phases. | Opus |

### Ops (1) -- Recommended

| Agent | Description |
|-------|-------------|
| **session-closer** | End-of-session archival and cleanup |

## Agent File Format

Each agent file uses YAML frontmatter for configuration:

```markdown
---
name: Engineer
description: Elite principal engineer...
model: opus
isolation: worktree
color: blue
permissions:
  allow:
    - "Bash"
    - "Read(*)"
    - "Write(*)"
    - "Edit(*)"
    - "Grep(*)"
    - "Glob(*)"
    - "WebFetch(domain:*)"
---

# Character: Webb -- "The Battle-Scarred Leader"

## Backstory
...

## Core Identity
...

## Startup Sequence
...
```

### Frontmatter Fields

| Field | Description |
|-------|-------------|
| `name` | Agent identifier |
| `description` | What the agent does |
| `model` | AI model to use (e.g., `opus`, `sonnet`) |
| `isolation` | Execution isolation (e.g., `worktree`) |
| `color` | Display color in terminal |
| `permissions.allow` | List of tools this agent can use |

## The Algorithm Agent

The Algorithm is TAI's execution methodology -- a 7-phase structured approach to any task:

1. **OBSERVE** -- Parse user request into Ideal State Criteria (ISC)
2. **THINK** -- Analyze requirements, challenge assumptions, discover constraints
3. **PLAN** -- Map ISC criteria to capabilities, identify dependencies
4. **BUILD** -- Track artifacts, discover new requirements during implementation
5. **EXECUTE** -- Monitor progress against ISC, discover edge cases
6. **VERIFY** -- Test each criterion with YES/NO evidence (ISC becomes ISVC)
7. **LEARN** -- Capture insights for the memory system

### Effort Levels

| Tier | Budget | ISC Range | When |
|------|--------|-----------|------|
| Standard | <2min | 8-16 | Normal request (default) |
| Extended | <8min | 16-32 | Quality must be extraordinary |
| Advanced | <16min | 24-48 | Substantial multi-file work |
| Deep | <32min | 40-80 | Complex design |
| Comprehensive | <120min | 64-150 | No time pressure |

### ISC Granularity Rule

Every criterion must be a single, granular fact verifiable with YES or NO:

| Wrong | Correct |
|-------|---------|
| Researched the topic fully | Plugin docs found at URL |
| Implemented the feature correctly | Button renders on page |
| Fixed all the issues | Null check added at line 47 |

## Building Custom Agents

### Directory

Place custom agent files in `.tai/agents/custom/`:

```
.tai/agents/custom/
├── README.md
└── my-agent.md
```

### File Format

```markdown
# Agent Name

Description of what this agent does.

## Tools
List of tools this agent can use.

## Instructions
Behavioral instructions for the agent.
```

Custom agents are automatically discovered by Claude Code when placed in the `custom/` directory. No registration in `packages.yaml` is needed.

## Agent Memory

Each agent can have persistent memory stored in `.tai/agent-memory/{AgentName}/`. This directory persists across conversations.

### How It Works

- `MEMORY.md` in the agent's memory directory is loaded into the agent's system prompt automatically
- Lines after 200 are truncated -- keep it concise
- Create separate topic files for detailed notes and link from `MEMORY.md`

### What to Save

- Stable patterns confirmed across interactions
- Key architectural decisions
- Important file paths
- Solutions to recurring problems
- Debugging insights

### What NOT to Save

- Session-specific context
- In-progress work
- Information duplicating CLAUDE.md
- Speculative or unverified conclusions

## Agent Package Tiers

```yaml
agents:
  core:
    version: "1.0.0"
    tier: required
    description: "Engineer, Architect, Designer, QATester, BrowserAgent, UIReviewer, visual-analyst"
  research:
    version: "1.0.0"
    tier: recommended
    description: "ClaudeResearcher, CodexResearcher, GeminiResearcher, GrokResearcher, PerplexityResearcher"
  security:
    version: "1.0.0"
    tier: optional
    description: "Pentester agent"
  creative:
    version: "1.0.0"
    tier: optional
    description: "Artist agent"
  execution:
    version: "1.0.0"
    tier: required
    description: "Algorithm execution agent"
  ops:
    version: "1.0.0"
    tier: recommended
    description: "session-closer agent"
```

## Related Pages

- [[Skill Packages]] -- Skill packages in the same registry
- [[Architecture]] -- How agents fit in the system
- [[CLI Reference]] -- Installing agent packages
