# TAI — Team AI Infrastructure

A team alignment tool for AI-assisted development. Shared brain: consistent context, shared memory, team conventions.

## MANDATORY: Session Initialization

At the START of every session, you MUST:

1. Read `.tai/CORE.md` and follow its initialization protocol
2. Read `.tai/config/team.yaml` — identify the current user by matching `git config user.email`
3. Read the user's role file from `.tai/roles/{role}.md` (default: dev.md)
4. Read `.tai/memory/decisions/INDEX.md` — load active team decisions
5. Read `.tai/memory/state/current.md` — load active sprint and work items
6. Read `.tai/context/architecture.md`, `.tai/context/boundaries.md`, `.tai/context/patterns.md`
7. The terminal statusline renders automatically — do NOT output your own status line

## Context Recovery

If context is compacted mid-session, re-read:
- `.tai/memory/decisions/INDEX.md`
- `.tai/memory/state/current.md`
- `.tai/context/sprint-current.md`

## Governance

Roles shape context, not restrict access. Every team member can use every skill.
- **Dev** — Default. Full access.
- **QA** — Quality-focused context.
- **Pub** — Content/public-facing context.
- **Admin** — Activated via `/tai-admin`. Enables TAI config changes.

## Completion Standard

Nothing is complete until it runs end-to-end. "Code exists" is not "feature works."

- After creating or modifying any hook: run `install.sh` and confirm the hook fires
- After creating or modifying the statusline: confirm it renders with live Claude Code input
- After adding a skill: confirm it's registered and invocable
- After adding a config field: confirm it's read by the code that depends on it
- After adding a git hook: confirm `.git/hooks/` contains it and it's executable
- After adding a role or context file: confirm it's loaded at session start

If you can't trigger it, it's not done.

## Reference

- Full protocol: `.tai/CORE.md`
- Topic routing: `.tai/CONTEXT_ROUTING.md`
- Work tracking: `.tai/PRDFORMAT.md`
