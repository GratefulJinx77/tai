# TAI — Team AI Infrastructure

A discipline framework for AI-assisted development teams. Forked from PAI (Personal AI Infrastructure).

## Quick Start

1. Configure `.tai/config/team.yaml` with team members and roles
2. Configure `.tai/config/project.yaml` with project stack details
3. Populate `.tai/context/boundaries.md` with forbidden import rules
4. Populate `.tai/context/patterns.md` with code conventions
5. Run `.tai/hooks/install.sh` to install git hooks
6. Launch Claude Code — TAI activates automatically via `.tai/CORE.md`

## Structure

```
.tai/
├── CORE.md          # Session initialization protocol (loaded after CLAUDE.md)
├── VERSION          # Semver manifest
├── config/          # team.yaml, project.yaml, models.yaml
├── context/         # architecture.md, boundaries.md, patterns.md, sprint-current.md
├── skills/          # Workflow definitions (development/, quality/, architecture/, project/)
├── hooks/           # Enforcement hooks (pre-commit, pre-push, post-session)
├── roles/           # Role context files (architect.md, developer.md, qa.md)
├── telemetry/       # JSONL logs (sessions, hooks, boundaries, ai-usage)
└── templates/       # PR description, sprint ISC, boundary examples
```

See `.tai/CORE.md` for the full session initialization protocol and team framework details.
