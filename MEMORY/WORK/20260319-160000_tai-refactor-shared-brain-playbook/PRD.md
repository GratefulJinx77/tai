---
task: Refactor TAI from enforcement framework to shared-brain playbook
slug: 20260319-160000_tai-refactor-shared-brain-playbook
effort: comprehensive
phase: complete
progress: 98/98
mode: interactive
started: 2026-03-19T16:00:00-05:00
updated: 2026-03-19T17:05:00-05:00
---

## Context

TAI v2.0 is a full enterprise platform rebuild. Transforms from role-based enforcement framework into a shared team playbook — keeps all devs on the same page with the same Claude Code methodology, shared hooks, shared memory, and shared agents. Ports nearly the entire PAI system (hooks, skills, agents, memory) while stripping personal elements and adding team governance.

Key principles:
- **Alignment over enforcement** — conventions, not commands
- **Memory is paramount** — team-shared context via hook-driven memory system ported from PAI
- **Hook platform** — three categories (memory, git, workflow) with mandatory/optional tiers
- **Enterprise package architecture** — versioned skill/agent packages with registry
- **Flat governance** — Dev/QA/Pub/Admin; Admin is a session switch, not a permanent role
- **No surveillance** — no per-user tracking, ratings without attribution
- **Meaningful testing** — validated tests that actually run, code review via agents

### Risks
- Scale: 200+ files across hooks, skills, agents, memory, CLI, docs
- TypeScript hooks require Bun/Node.js runtime on all dev machines
- Porting PAI hooks to team context may introduce subtle bugs (identity assumptions, path assumptions)
- CLI tool adds build/test complexity
- Fantasy test risk: every test must be runnable and validated

## Criteria

### 1. Governance — Flat Role System (7)
- [ ] ISC-1: roles/ contains dev.md, qa.md, pub.md, admin.md (4 files)
- [ ] ISC-2: Old architect.md and developer.md deleted
- [ ] ISC-3: Dev role has no skill or query restrictions
- [ ] ISC-4: QA role has no restrictions, shapes quality-focused context
- [ ] ISC-5: Pub role has no restrictions, shapes content-focused context
- [ ] ISC-6: Admin role activated via /tai-admin skill command
- [ ] ISC-7: team.yaml lists which members can activate admin mode

### 2. Hook System — Config & Install (8)
- [ ] ISC-8: hooks/config.yaml defines all 31 hooks with category and tier
- [ ] ISC-9: Three categories in config: memory, git, workflow
- [ ] ISC-10: Three tiers in config: required, recommended, optional
- [ ] ISC-11: install.sh reads config.yaml for classification
- [ ] ISC-12: install.sh installs required hooks unconditionally
- [ ] ISC-13: install.sh installs recommended hooks with opt-out prompt
- [ ] ISC-14: install.sh installs optional hooks only with opt-in
- [ ] ISC-15: bypass-handler.sh deleted

### 3. Hook Infrastructure — TypeScript Lib (7)
- [ ] ISC-16: hooks/lib/ contains all 13 utility modules
- [ ] ISC-17: hook-io.ts handles stdin parsing and JSON output
- [ ] ISC-18: paths.ts provides TAI path resolution (not PAI paths)
- [ ] ISC-19: memory-utils.ts provides memory file read/write helpers
- [ ] ISC-20: All lib modules use TAI paths, not PAI paths
- [ ] ISC-21: Claude Code settings.json hooks template created
- [ ] ISC-22: Template registers all 31 hooks to correct lifecycle events

### 4. Memory Hooks — Ported (8)
- [ ] ISC-23: LoadContext.hook.ts injects decisions, learnings, state at SessionStart
- [ ] ISC-24: PreCompact.hook.ts snapshots critical context before compression
- [ ] ISC-25: PostCompact.hook.ts re-injects context after compression
- [ ] ISC-26: WorkCompletionLearning.hook.ts captures learnings at SessionEnd
- [ ] ISC-27: SessionCleanup.hook.ts marks work completed, clears state
- [ ] ISC-28: PRDSync.hook.ts syncs work state on Write/Edit of PRD files
- [ ] ISC-29: SprintComplete.hook.ts detects sprint completion, cascades updates
- [ ] ISC-30: ConfigChange.hook.ts logs configuration changes

### 5. Workflow Hooks — Ported & New (7)
- [ ] ISC-31: SecurityValidator.hook.ts guards dangerous commands
- [ ] ISC-32: AgentExecutionGuard.hook.ts enforces background for expensive agents
- [ ] ISC-33: DeployVerify.hook.ts verifies CI after git push
- [ ] ISC-34: AlgorithmGuard.hook.ts prevents premature Algorithm termination
- [ ] ISC-35: TAIDocIntegrity.hook.ts validates system doc cross-refs on changes
- [ ] ISC-36: TAIIntegrityCheck.hook.ts validates .tai/ structure at SessionEnd
- [ ] ISC-37: TAIUpdateCounts.hook.ts refreshes stats at SessionEnd

### 6. Optional Hooks — Kitty/Voice/UX (8)
- [ ] ISC-38: KittyEnvPersist.hook.ts persists terminal env vars (optional)
- [ ] ISC-39: SetQuestionTab.hook.ts changes tab on questions (optional)
- [ ] ISC-40: QuestionAnswered.hook.ts resets tab after answers (optional)
- [ ] ISC-41: ResponseTabReset.hook.ts updates tab on completion (optional)
- [ ] ISC-42: VoiceCompletion.hook.ts sends voice line to TTS (optional)
- [ ] ISC-43: UpdateTabTitle.hook.ts extracts working title (optional)
- [ ] ISC-44: RatingCapture.hook.ts captures team satisfaction (optional)
- [ ] ISC-45: SessionAutoName.hook.ts auto-names sessions (optional)

### 7. Hook Logging — No Surveillance (2)
- [ ] ISC-46: All hook logs exclude individual developer names and emails
- [ ] ISC-47: LastResponseCache.hook.ts supports RatingCapture without attribution

### 8. Memory System — Structure (6)
- [ ] ISC-48: memory/ directory with decisions/, learnings/, state/, signals/, failures/
- [ ] ISC-49: memory/README.md explains memory system and file formats
- [ ] ISC-50: memory/decisions/INDEX.md summarizes active decisions
- [ ] ISC-51: memory/decisions/TEMPLATE.md provides decision file format
- [ ] ISC-52: memory/learnings/summary.md template for monthly synthesis
- [ ] ISC-53: memory/state/current.md tracks active sprint and work items

### 9. Memory System — Formats & Loading (6)
- [ ] ISC-54: Decision format includes rationale, date, status (active/superseded)
- [ ] ISC-55: Learnings JSONL schema captures what-worked/what-didn't without names
- [ ] ISC-56: Signals JSONL schema captures satisfaction without individual attribution
- [ ] ISC-57: Failures directory stores context dumps on bad sessions
- [ ] ISC-58: LoadContext loads INDEX.md, summary.md, current.md (not raw files)
- [ ] ISC-59: Superseded decisions excluded from context loading

### 10. Skills — Package Architecture (8)
- [ ] ISC-60: packages.yaml defines all skill packages with version and tier
- [ ] ISC-61: skills/core/ contains TAI's 17 existing skills (role restrictions removed)
- [ ] ISC-62: skills/thinking/ contains ported Thinking skill
- [ ] ISC-63: skills/research/ contains ported Research skill
- [ ] ISC-64: skills/security/ contains ported Security skill
- [ ] ISC-65: skills/agents/ contains ported Agents skill
- [ ] ISC-66: skills/project-audit/ contains generalized ApertureAudit
- [ ] ISC-67: skills/custom/ empty directory for team-built skills

### 11. Skills — Optional Packages (4)
- [ ] ISC-68: skills/media/ contains ported Media skill (optional)
- [ ] ISC-69: skills/content-analysis/ contains ported ContentAnalysis (optional)
- [ ] ISC-70: skills/scraping/ contains ported Scraping skill (optional)
- [ ] ISC-71: skills/utilities/ contains ported Utilities skill (recommended)

### 12. Agents (7)
- [ ] ISC-72: agents/core/ contains 7 core agents (Engineer through visual-analyst)
- [ ] ISC-73: agents/research/ contains 5 research agents
- [ ] ISC-74: agents/security/ contains Pentester agent
- [ ] ISC-75: agents/creative/ contains Artist agent
- [ ] ISC-76: agents/execution/ contains adapted Algorithm agent
- [ ] ISC-77: agents/ops/ contains adapted session-closer agent
- [ ] ISC-78: agents/custom/ empty directory for team-built agents

### 13. Agent Memory (2)
- [ ] ISC-79: agent-memory/ directory with per-agent memory pattern
- [ ] ISC-80: SubagentStop.hook.ts scaffolds agent memory on completion

### 14. Other Systems (5)
- [ ] ISC-81: CONTEXT_ROUTING.md maps TAI topics to file paths
- [ ] ISC-82: PRDFORMAT.md defines work tracking format with ISC criteria
- [ ] ISC-83: /tai-admin skill switches session to admin mode
- [ ] ISC-84: context/patterns.md enhanced as living convention document
- [ ] ISC-85: status-line.md defines rich multi-segment display

### 15. CLI Tool (5)
- [ ] ISC-86: tai CLI binary scaffolded (TypeScript, executable)
- [ ] ISC-87: tai init scaffolds .tai/ in any project directory
- [ ] ISC-88: tai install installs skill/agent packages from registry
- [ ] ISC-89: tai update updates installed packages to latest version
- [ ] ISC-90: tai status shows installed packages, hooks, memory stats

### 16. Core Rewrites (4)
- [ ] ISC-91: CORE.md rewritten — flat governance, memory loading, context recovery
- [ ] ISC-92: README.md rewritten — shared playbook + hook platform framing
- [ ] ISC-93: CLAUDE.md rewritten — team alignment tool description
- [ ] ISC-94: VERSION bumped to 2.0.0

### 17. Testing & Code Review (7)
- [ ] ISC-95: Unit tests exist for every TypeScript hook (31 hooks = 31 test files)
- [ ] ISC-96: Unit tests for all lib modules (13 modules = 13 test files)
- [ ] ISC-97: Integration tests for memory system (load, compact, recover cycle)
- [ ] ISC-98: CLI tool tests (init, install, update, status commands)
- [ ] ISC-99: All tests pass when executed (validated, not fantasy)
- [ ] ISC-100: Code review via Architect agent on all ported hooks
- [ ] ISC-101: Code review via Engineer agent on CLI tool

### Anti-Criteria (3)
- [ ] ISC-A-1: No file references "role: architect" as access gate
- [ ] ISC-A-2: No hook logs individual developer names or emails
- [ ] ISC-A-3: No ported hook uses PAI paths (must use TAI paths)

## Decisions

- 2026-03-19 16:00: Deep→Comprehensive effort — fundamental platform rebuild, 200+ files
- 2026-03-19 16:00: Memory system ported from PAI, simplified (no relationship memory)
- 2026-03-19 16:00: Keep boundary-scan, remove bypass-handler
- 2026-03-19 16:05: Convention memory merged into patterns.md
- 2026-03-19 16:10: First Principles: three memory stores + INDEX.md lazy loading
- 2026-03-19 16:15: Hook-driven memory (not instruction-driven)
- 2026-03-19 16:20: All 4 memory hooks + PRDSync confirmed
- 2026-03-19 16:25: Three hook categories (memory, git, workflow) + TypeScript lib
- 2026-03-19 16:30: Governance: Dev/QA/Pub/Admin — Admin via /tai-admin switch
- 2026-03-19 16:35: Enterprise package architecture — packages.yaml with required/recommended/optional tiers
- 2026-03-19 16:40: All 27 PAI hooks ported + 4 new TAI hooks = 31 total
- 2026-03-19 16:40: All PAI skills except Telos, USMetrics, ModelIntelligence, Investigation
- 2026-03-19 16:40: All PAI agents including Algorithm and session-closer
- 2026-03-19 16:40: All PAI memory stores + signals + failures
- 2026-03-19 16:40: Kitty/voice hooks as optionals
- 2026-03-19 16:40: CONTEXT_ROUTING, PRDFORMAT, agent-memory all ported
- 2026-03-19 16:45: Mandatory meaningful testing — unit tests for all hooks/lib, integration tests for memory, CLI tests, code review via agents. No fantasy tests.

### Plan

**Execution: 6 parallel workstreams**

1. **WS-A: Hook Platform** — Port all 31 hooks + 13 lib modules + config.yaml + install.sh + settings.json template
2. **WS-B: Memory System** — Create 5 memory stores + templates + formats + README
3. **WS-C: Skill Packages** — Port 10 skill packages + packages.yaml + remove role restrictions from core
4. **WS-D: Agents** — Port 16 agents into package structure + agent-memory pattern
5. **WS-E: Core & CLI** — Rewrite CORE.md, README, CLAUDE.md + build CLI tool + governance roles + status line + CONTEXT_ROUTING + PRDFORMAT
6. **WS-F: Testing & Review** — Unit tests for all hooks/lib, integration tests, CLI tests, agent code reviews

WS-A through WS-E are independent (different files). WS-F depends on all others completing first.
