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
6. Have them run `curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash` to install hooks

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

Yes. Clone TAI and run `install.sh` from the monorepo root. The `.tai/` directory sits alongside your existing structure. Boundaries in `context/boundaries.md` can define service separation rules between packages.

---

### How much disk space does TAI use?

The `.tai/` directory is mostly Markdown and YAML files. A typical installation is under 5MB. Memory stores grow over time with decisions, learnings, and signals, but these are text files -- growth is minimal.

---

### Where are telemetry logs stored?

Telemetry logs are stored locally in `.tai/telemetry/` as JSONL files. They are not sent anywhere external. The logs include session metadata, hook execution records, and boundary violations.

You can gitignore the telemetry directory if you don't want logs committed.

---

### How do I upgrade TAI to a newer version?

Run the same setup command you used to install:

```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
```

It auto-detects the existing install, pulls the latest framework, and re-registers hooks. Your config, context, and memory files are never overwritten.

For major version upgrades, see the [[Migration Guide]].

---

### How do I update my team name, city, or project settings?

Run the setup script with `--reconfigure`:

```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash -s -- --reconfigure
```

This re-runs the interactive wizard with your current values pre-filled as defaults. Only `team.yaml` and `project.yaml` are rewritten — hooks, memory, and everything else stay untouched.

---

## Troubleshooting

### Context bar shows 0% {#context-bar-shows-0}

**Cause:** `jq` is not installed. The statusline parses Claude Code's JSON input with `jq`. Without it, the jq call fails silently (stderr is suppressed) and `context_pct` defaults to 0.

**Fix:** Install jq, then restart your Claude session:
```bash
sudo apt install jq    # Linux
brew install jq         # macOS
```

### Pre-commit hook crashes with "unexpected EOF"

**Cause:** `project.yaml` has empty values with inline comments (e.g., `lint: ""  # example`). The YAML comment wasn't stripped before `eval`, producing garbage. Fixed in TAI v2.0.0+.

**Fix:** Re-run the setup script:
```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
```

### Hooks don't fire

**Cause:** `.claude/settings.local.json` doesn't exist or doesn't contain hook registrations.

**Fix:** Re-run the setup script, then restart your Claude session:
```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
```

### "Cannot find package 'yaml'"

**Cause:** `bun install` was not run in the TAI directory.

**Fix:**
```bash
cd .tai-upstream && bun install
```

### Statusline shows but never updates

**Cause:** `settings.local.json` was created or changed mid-session. Claude Code loads settings at session start.

**Fix:** Restart your Claude session.

### "detached HEAD" when pulling TAI updates

**Cause:** TAI was cloned or checked out without tracking a branch.

**Fix:**
```bash
cd .tai-upstream && git checkout main && git pull
```

### "Cannot find package 'commander'"

**Cause:** CLI dependencies were not installed. The CLI has its own `package.json` in `cli/`.

**Fix:** Re-run the setup script (it now installs both root and CLI dependencies):
```bash
curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
```

### Install script fails with "Missing required dependencies"

**Cause:** One or more of jq, bun, or python3 is not installed.

**Fix:** Install the missing dependency. The error message tells you which one.

---

## Related Pages

- [[Getting Started]] -- Installation and first session
- [[Governance]] -- Roles and team configuration
- [[Hook System]] -- Hook management
- [[Memory System]] -- Memory stores and context loading
- [[Architecture]] -- System design overview
