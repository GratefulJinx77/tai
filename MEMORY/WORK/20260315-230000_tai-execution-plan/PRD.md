---
task: Build TAI execution plan from v1.1 spec
slug: 20260315-230000_tai-execution-plan
effort: extended
phase: complete
progress: 20/20
mode: interactive
started: 2026-03-15T23:00:00Z
updated: 2026-03-15T23:01:00Z
---

## Context

User has a locked-down TAI Architecture Spec v1.1 (DOCX) with 12 design decisions resolved through a structured Q&A process. Needs an execution plan organized into sprints (target: 10 or fewer) that sequences all work from the spec into buildable, testable increments.

This is a planning artifact — a DOCX document with sprint-by-sprint breakdown, dependencies, deliverables, acceptance criteria, and effort estimates. No code is produced.

The spec covers: directory structure, CORE.md session init, role system (3 roles + git email ID), 11 skills, 4 enforcement hooks, boundary analysis, bypass-with-reason protocol, JSONL telemetry via git, GitHub Action aggregation, CLI status line (7 segments), 6 slash commands, notification system, semver versioning, CLAUDE.md migration, and onboarding docs.

### Risks
- Sprint scope too fat — each sprint must be completable in 1-2 weeks
- Dependency ordering wrong — building skills before hooks means no enforcement
- Missing the 10-sprint target — may need to combine related work
- Plan disconnected from spec acceptance criteria (Section 13, 19 items)

## Criteria

- [x] ISC-1: Execution plan document exists as DOCX at builds/tai/docs/
- [x] ISC-2: Plan organized into discrete numbered sprints
- [x] ISC-3: Sprint count is 10 or fewer
- [x] ISC-4: Each sprint has a clear name and objective statement
- [x] ISC-5: Each sprint lists specific deliverables (files created/modified)
- [x] ISC-6: Each sprint has acceptance criteria derived from spec Section 13
- [x] ISC-7: Each sprint has an effort estimate in hours
- [x] ISC-8: Dependencies between sprints are explicitly documented
- [x] ISC-9: Sprint 1 establishes directory structure and CORE.md foundation
- [x] ISC-10: Role system (git email + TAI_ROLE) is sequenced before skills
- [x] ISC-11: Hooks are sequenced before skills that depend on them
- [x] ISC-12: Telemetry pipeline is sequenced before slash commands that read it
- [x] ISC-13: CLI status line sprint follows telemetry (it reads JSONL data)
- [x] ISC-14: All 11 skills from spec Section 5.1 are assigned to a sprint
- [x] ISC-15: All 6 slash commands from spec Section 8.3 are assigned to a sprint
- [x] ISC-16: GitHub Action for telemetry aggregation is assigned to a sprint
- [x] ISC-17: Notification system is assigned to a sprint
- [x] ISC-18: CLAUDE.md migration is assigned to a sprint
- [x] ISC-19: Integration testing / role walkthrough is assigned to a sprint
- [x] ISC-20: Plan maps all 19 spec acceptance criteria to sprint deliverables
