# Hook System

TAI hooks enforce team conventions at key checkpoints in the Claude Code lifecycle. Hooks are team agreements, not surveillance -- bypass requires a reason string, logged without individual attribution.

## Overview

Hooks are TypeScript or shell scripts that execute at specific Claude Code lifecycle events. They can inject context, validate operations, capture learnings, and enforce team standards.

TAI ships with **27 hooks** organized into categories and tiers.

## Three Categories

### Memory Hooks (Session Lifecycle)

Manage context loading, recovery, and session cleanup.

| Hook | Event | Tier | Description |
|------|-------|------|-------------|
| LoadContext | SessionStart | Required | Inject dynamic context (learnings, active work) at session start |
| PreCompact | PreCompact | Required | Snapshot critical state before context compaction |
| PostCompact | PostCompact | Required | Re-inject critical state after context compaction |
| WorkCompletionLearning | SessionEnd | Recommended | Capture learnings from completed work sessions |
| SessionCleanup | SessionEnd | Required | Mark work complete, clear state, reset tab |
| PRDSync | PostToolUse (Write, Edit) | Recommended | Sync PRD frontmatter to work.json dashboard |
| SprintComplete | PostToolUse (Write, Edit) | Recommended | Log sprint completion when PRD phase reaches complete |
| ConfigChange | ConfigChange | Recommended | Log configuration changes for observability |

### Workflow Hooks (Enforcement)

Validate operations and guard against common mistakes.

| Hook | Event | Tier | Description |
|------|-------|------|-------------|
| SecurityValidator | PreToolUse (Bash, Edit, Write, Read) | Required | Validate commands and file access against security patterns |
| AgentExecutionGuard | PreToolUse (Task, Agent) | Recommended | Warn when non-fast agents are spawned without background flag |
| DeployVerify | PostToolUse (Bash) | Recommended | Wait for CI after git push, report pass/fail |
| AlgorithmGuard | Stop | Recommended | Prevent premature Algorithm termination |
| SubagentStop | SubagentStop | Recommended | Log subagent completion, scaffold agent memory |
| TAIDocIntegrity | Stop | Recommended | Validate TAI doc consistency (CORE.md, config cross-refs) |
| TAIIntegrityCheck | SessionEnd | Recommended | Validate TAI directory structure completeness |
| TAIConfigValidation | PostToolUse (Write, Edit) | Recommended | Validate TAI config files on change |
| TAIBuildCLAUDE | PostToolUse (Write, Edit) | Recommended | Detect when CLAUDE.md may need rebuilding |

### Optional Hooks (Terminal UX and Integrity)

Enhance the terminal experience and system integrity.

| Hook | Event | Tier | Description |
|------|-------|------|-------------|
| KittyEnvPersist | SessionStart | Optional | Persist Kitty terminal env vars + reset tab title |
| SetQuestionTab | PreToolUse (AskUserQuestion) | Optional | Set tab to teal when awaiting user input |
| QuestionAnswered | PostToolUse (AskUserQuestion) | Optional | Reset tab from question state after answer |
| ResponseTabReset | Stop | Optional | Convert working title to past tense on completion |
| VoiceCompletion | Stop | Optional | Send completion voice line to TTS server |
| UpdateTabTitle | UserPromptSubmit | Optional | Update tab title based on user prompt |
| RatingCapture | UserPromptSubmit | Optional | Capture explicit and implicit ratings |
| SessionAutoName | UserPromptSubmit | Optional | Auto-generate 4-word session names |
| LastResponseCache | Stop | Optional | Cache last response for RatingCapture bridge |
| DocIntegrity | Stop | Optional | Check cross-refs when system docs/hooks modified |
| IntegrityCheck | SessionEnd | Optional | Detect system file changes, log for maintenance |
| UpdateCounts | SessionEnd | Optional | Refresh system counts (skills, hooks, ratings) |
| TAIUpdateCounts | SessionEnd | Optional | Collect TAI-specific metrics (team, boundaries, security) |

## Three Tiers

| Tier | Behavior | Install Default |
|------|----------|-----------------|
| **Required** | Always installed, cannot be disabled | All modes |
| **Recommended** | Installed by default, can be skipped with `--minimal` | Default + `--all` |
| **Optional** | Not installed by default, enable with `--all` or individually | `--all` only |

## Installing Hooks

The installer is at `.tai/hooks/install.sh`:

```bash
# Install required + recommended hooks (default)
.tai/hooks/install.sh

# Install required hooks only
.tai/hooks/install.sh --minimal

# Install all hooks (required + recommended + optional)
.tai/hooks/install.sh --all

# List all hooks and their tiers
.tai/hooks/install.sh --list
```

The installer:
1. Makes all hook scripts executable
2. Symlinks git hooks (pre-commit, pre-push) into `.git/hooks/`
3. Backs up any existing git hooks as `*.bak`
4. Reports installation counts per tier

### Registering with Claude Code

After running the installer, copy the relevant sections from `.tai/hooks/settings-template.json` into your Claude Code `settings.json`.

The template organizes hooks by event type:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bun run .tai/hooks/LoadContext.hook.ts"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read",
        "hooks": [
          {
            "type": "command",
            "command": "bun run .tai/hooks/SecurityValidator.hook.ts"
          }
        ]
      }
    ]
  }
}
```

## config.yaml Reference

The hook configuration file at `.tai/hooks/config.yaml` defines all hooks with their metadata:

```yaml
version: "2.0"

hooks:
  LoadContext:
    file: LoadContext.hook.ts
    event: SessionStart
    tier: required
    description: Inject dynamic context (learnings, active work) at session start

  SecurityValidator:
    file: SecurityValidator.hook.ts
    event: PreToolUse
    matcher: [Bash, Edit, Write, Read]
    tier: required
    description: Validate commands and file access against security patterns
```

Each hook entry specifies:

| Field | Description |
|-------|-------------|
| `file` | Script filename in `.tai/hooks/` |
| `event` | Claude Code hook event type (SessionStart, PreToolUse, PostToolUse, Stop, etc.) |
| `matcher` | Tool matcher for PreToolUse/PostToolUse hooks (optional) |
| `tier` | `required`, `recommended`, or `optional` |
| `description` | Human-readable description |

## Building Custom Hooks

### File Format

Hook scripts are TypeScript (`.hook.ts`) or shell (`.sh`) files placed in `.tai/hooks/`.

TypeScript hooks should:
1. Read stdin for hook input
2. Use the shared library from `hooks/lib/` for common utilities
3. Output JSON to stdout for hook responses
4. Exit 0 on success

### Hook Library (`hooks/lib/`)

The `hooks/lib/` directory contains shared utilities used by hook implementations:
- Reading hook input from stdin
- Path resolution
- Common validation patterns
- JSON output formatting

### Lifecycle Events

| Event | When It Fires | Use Case |
|-------|--------------|----------|
| `SessionStart` | Claude Code session begins | Load context, set up environment |
| `PreCompact` | Before context compression | Snapshot critical state |
| `PostCompact` | After context compression | Re-inject critical state |
| `PreToolUse` | Before a tool executes | Validate, allow/deny/ask |
| `PostToolUse` | After a tool executes | Log, validate output, sync state |
| `UserPromptSubmit` | User sends a prompt | Capture ratings, update tab |
| `Stop` | Response generation completes | Verify, reset UI, guard completion |
| `SessionEnd` | Session terminates | Capture learnings, cleanup |
| `SubagentStop` | Subagent completes | Log completion, scaffold memory |
| `ConfigChange` | Settings change | Log for observability |

### JSON Output Schemas

Hooks communicate decisions through JSON output on stdout.

**PreToolUse hooks** (allow, deny, or ask):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Operation is safe"
  }
}
```

**PostToolUse hooks** (add context):
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Deployment verified: CI passed"
  }
}
```

**Stop hooks** (approve or block):
```json
{
  "decision": "block",
  "reason": "Algorithm phase not complete"
}
```

### Registering Custom Hooks

1. Create your hook in `.tai/hooks/my-hook.hook.ts`
2. Add it to `.tai/hooks/config.yaml`:
   ```yaml
   hooks:
     MyHook:
       file: my-hook.hook.ts
       event: PreToolUse
       matcher: [Bash]
       tier: recommended
       description: Custom validation for bash commands
   ```
3. Add the corresponding entry to `settings-template.json`
4. Run `.tai/hooks/install.sh` to activate

## Related Pages

- [[Architecture]] -- Hook lifecycle in the broader system
- [[Memory System]] -- How memory hooks manage context
- [[Getting Started]] -- Installing hooks during setup
