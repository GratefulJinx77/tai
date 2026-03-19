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
7. Display the status line as your FIRST output:

```
── │ TAI │ ──────────────────────────────────
ENV: TAI:{version from .tai/VERSION} │ Hooks: {count from hooks/config.yaml}
◈ PWD: {project name} │ Branch: {git branch} │ Role: {user role}
◎ MEMORY: {n} Decisions │ {n} Learnings │ {n} Signals
◐ SPRINT: {from context/sprint-current.md} │ {n}/{m} ISC
──────────────────────────────────────────────
```

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

## Reference

- Full protocol: `.tai/CORE.md`
- Topic routing: `.tai/CONTEXT_ROUTING.md`
- Work tracking: `.tai/PRDFORMAT.md`
