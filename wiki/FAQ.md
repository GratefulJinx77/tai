# FAQ

Common questions and troubleshooting for TAI.

---

### How is this different from just a CLAUDE.md file?

A CLAUDE.md file is a single static document. TAI adds:

- **Shared memory** that persists across sessions and team members (decisions, learnings, work state)
- **Automatic context loading** via hooks -- the AI starts every session with full team context
- **Context recovery** after compaction -- critical state is re-injected automatically
- **Role-based context** -- different team members get different context focus
- **Convention enforcement** via hooks (security validation, boundary scanning, deploy verification)
- **Skill and agent packages** -- reusable workflows and specialized AI agents
- **A CLI tool** for project initialization and package management

Think of CLAUDE.md as a note taped to the AI's monitor. TAI is the entire team's shared workspace with memory, conventions, and workflows.

---

### Do all team members need the same Claude Code version?

No. TAI works with any Claude Code version that supports hooks (settings.json `hooks` configuration). The status line displays the Claude Code version for visibility, but TAI does not enforce a specific version.

Team members should use reasonably current versions to ensure hook compatibility.

---

### How do I add a new team member?

1. Edit `.tai/config/team.yaml`
2. Add their entry under `members`:
   ```yaml
   - name: "Carol"
     email: "carol@company.com"
     github: "carol-gh"
     default_role: dev
   ```
3. Ensure their `email` matches their `git config user.email`
4. If they should be an admin, add their email to `admin_users`
5. Commit the change
6. Have them run `.tai/hooks/install.sh` and register hooks in their Claude Code settings

See [[Governance]] for details on roles and admin mode.

---

### How do I make a hook mandatory?

Set the hook's tier to `required` in `.tai/hooks/config.yaml`:

```yaml
hooks:
  MyHook:
    file: my-hook.hook.ts
    event: PreToolUse
    matcher: [Bash]
    tier: required
    description: My mandatory hook
```

Required hooks are always installed and cannot be disabled via `--minimal` mode.

---

### What happens if two people edit a decision file at the same time?

Decision files are Markdown files in git. Standard git merge conflict resolution applies. Since decisions are typically added as new files (not edits to existing files), conflicts are rare.

The `INDEX.md` file could conflict if two people add entries simultaneously. Resolve as you would any git merge conflict -- both entries should be kept.

---

### How do I disable a hook for myself?

TAI hooks are team agreements. To disable a hook:

1. **Recommended/Optional hooks:** Remove the hook's entry from your personal Claude Code `settings.json`. This only affects your sessions.

2. **Required hooks:** These cannot be disabled per-team-member. If you believe a required hook should be optional, discuss with the team and have an admin change its tier in `hooks/config.yaml`.

3. **Git hooks (pre-commit, pre-push):** Remove the symlink from `.git/hooks/`. Note that `install.sh` will re-create it.

---

### How do I record an architectural decision?

1. Copy `.tai/memory/decisions/TEMPLATE.md` to a new file:
   ```bash
   cp .tai/memory/decisions/TEMPLATE.md .tai/memory/decisions/003-chose-redis.md
   ```
2. Fill in the decision details (date, context, decision, alternatives considered)
3. Add a one-line summary to `.tai/memory/decisions/INDEX.md`
4. Commit both files

The decision will be loaded into every team member's session from that point forward.

See [[Memory System]] for details on the decision format.

---

### How does context recovery work?

When Claude Code compresses conversation history (compaction), TAI's PreCompact hook snapshots critical state, and the PostCompact hook re-injects it:

1. **PreCompact** saves: active decisions, current work state, sprint criteria
2. Claude Code compresses the conversation
3. **PostCompact** re-injects the saved state

This ensures long sessions don't lose awareness of team decisions and current work.

See [[Architecture]] for the full compaction lifecycle diagram.

---

### What is the Algorithm?

The Algorithm is TAI's structured execution methodology, implemented as the Algorithm agent ("Vera Sterling"). It uses 7 phases:

1. **OBSERVE** -- Parse requests into Ideal State Criteria (ISC)
2. **THINK** -- Analyze and challenge assumptions
3. **PLAN** -- Map criteria to capabilities
4. **BUILD** -- Implement with ISC tracking
5. **EXECUTE** -- Monitor progress
6. **VERIFY** -- Test each criterion with YES/NO evidence
7. **LEARN** -- Capture insights for team memory

See [[Agents]] for details on the Algorithm agent and effort levels.

---

### How do I use TAI with an existing CI/CD pipeline?

TAI hooks are local to Claude Code sessions -- they don't interfere with your CI/CD pipeline. The git hooks (pre-commit, pre-push) integrate with your existing git workflow.

The DeployVerify hook watches for `git push` commands and waits for CI to pass before reporting results, but it doesn't modify your CI pipeline.

---

### Can I use TAI with a monorepo?

Yes. Run `tai init` in the monorepo root. The `.tai/` directory sits alongside your existing structure. Boundaries in `context/boundaries.md` can define service separation rules between packages.

---

### How much disk space does TAI use?

The `.tai/` directory is mostly Markdown and YAML files. A typical installation is under 5MB. Memory stores grow over time with decisions, learnings, and signals, but these are text files -- growth is minimal.

---

### Where are telemetry logs stored?

Telemetry logs are stored locally in `.tai/telemetry/` as JSONL files. They are not sent anywhere external. The logs include session metadata, hook execution records, and boundary violations.

You can gitignore the telemetry directory if you don't want logs committed.

---

### How do I upgrade TAI to a newer version?

```bash
tai update
```

For major version upgrades, see the [[Migration Guide]].

---

## Related Pages

- [[Getting Started]] -- Installation and first session
- [[Governance]] -- Roles and team configuration
- [[Hook System]] -- Hook management
- [[Memory System]] -- Memory stores and context loading
- [[Architecture]] -- System design overview
