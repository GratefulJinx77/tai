# TAI Installation Guide

## Prerequisites

Install these before running the TAI installer:

| Dependency | Why | Install |
|------------|-----|---------|
| **jq** | Statusline and hooks parse JSON from Claude Code | `sudo apt install jq` (Linux) / `brew install jq` (macOS) |
| **bun** | Runs TypeScript hooks without compilation | [bun.sh](https://bun.sh) |
| **python3** | Install script uses Python for settings merge | Pre-installed on most systems |
| **git** | Version control, hook installation | Pre-installed on most systems |

**Verify all four:**

```bash
jq --version && bun --version && python3 --version && git --version
```

If any command fails, install it before proceeding. The installer will refuse to run with missing dependencies.

## Installation

### 1. Clone TAI into your project

```bash
cd /path/to/your-project
git clone https://github.com/GratefulJinx77/tai.git .tai-upstream
```

This creates `.tai-upstream/` containing the TAI framework. Your project's instance data will live in `.tai/`.

### 2. Install dependencies

```bash
cd .tai-upstream
bun install
cd ..
```

This installs the `yaml` package that TAI hooks require.

### 3. Run the installer

```bash
.tai-upstream/.tai/hooks/install.sh
```

**What it does:**

- Scaffolds `.tai/` instance directories (config, context, memory, roles) — copies templates, never overwrites existing files
- Creates `.claude/settings.local.json` — registers 17 hooks and the statusline with Claude Code
- Creates `.claude/rules/tai.md` — session initialization instructions
- Creates `.claude/commands/*.md` — 5 slash commands (`/tai-validate`, `/tai-admin`, `/tai-sprint`, `/tai-decisions`, `/tai-health`)
- Symlinks git hooks (pre-commit, pre-push) to `.git/hooks/`
- If your project has a CLAUDE.md with >500 bytes of content, creates `.tai/context/.bootstrap-pending` for automatic context extraction on first session

**Install modes:**

```bash
.tai-upstream/.tai/hooks/install.sh              # Required + recommended hooks (default)
.tai-upstream/.tai/hooks/install.sh --minimal     # Required hooks only
.tai-upstream/.tai/hooks/install.sh --all         # All hooks including optional
.tai-upstream/.tai/hooks/install.sh --list        # List all hooks and their tiers
```

### 4. Configure your team

Edit `.tai/config/team.yaml`:

```yaml
team:
  name: "Your Team"
  admin_users: ["your.email@company.com"]
  members:
    - name: "Your Name"
      email: "your.email@company.com"
      github: "your-github-handle"
      default_role: dev
      location:
        city: "Your City"
        state: "Your State"
```

The `email` field must match your `git config user.email` — TAI uses this to identify you.

### 5. Configure your project

Edit `.tai/config/project.yaml`:

```yaml
project:
  name: "your-project"
  description: "What this project does"

  stack:
    language: "TypeScript"
    framework: "React"
    database: "PostgreSQL"
    test_runner: "Vitest"
    linter: "ESLint"
    type_checker: "tsc"

  commands:
    build: "npm run build"
    test: "npm test"
    lint: "npm run lint"
    type_check: "npx tsc --noEmit"
    dev: "npm run dev"
```

Leave commands empty (`""`) to skip them in pre-commit/pre-push hooks.

### 6. Start a Claude Code session

```bash
claude
```

On the first session, TAI will:
- Load your role context
- Load team decisions and active sprint
- Display the statusline at the bottom of the terminal
- If `.bootstrap-pending` exists, extract architecture context from your CLAUDE.md

## Verification

After installation, verify everything works:

```bash
# 1. Settings file exists with hooks and statusline
grep -c '"hooks"' .claude/settings.local.json    # Should print 1
grep -c '"statusLine"' .claude/settings.local.json  # Should print 1

# 2. Git hooks are linked
ls -la .git/hooks/pre-commit .git/hooks/pre-push  # Should show symlinks

# 3. Slash commands registered
ls .claude/commands/  # Should list 5 .md files

# 4. Hooks can fire
echo '{}' | bun run .tai/hooks/LoadContext.hook.ts 2>&1 | head -3  # Should show systemMessage

# 5. Statusline renders
echo '{"context_window":{"used_percentage":50}}' | bash .tai/hooks/statusline-command.sh 2>&1 | grep "%"
# Should show "CONTEXT: ⛁⛁⛁... 50%"

# 6. Pre-commit works
bash .tai/hooks/pre-commit.sh  # Should pass (or skip unconfigured commands)
```

## Updating TAI

```bash
cd .tai-upstream
git pull
bun install
cd ..
.tai-upstream/.tai/hooks/install.sh
```

The installer never overwrites instance files (config, context, memory). It only updates hook registrations, slash commands, and the rules file.

## Troubleshooting

### Context bar shows 0%

**Cause:** `jq` is not installed. The statusline parses Claude Code's JSON input with `jq`. Without it, the parsing fails silently and defaults to 0%.

**Fix:** `sudo apt install jq` (or `brew install jq` on macOS), then restart your Claude session.

### Pre-commit hook crashes with "unexpected EOF"

**Cause:** `project.yaml` has empty values with inline comments (e.g., `lint: ""  # example`). Fixed in TAI v2.0.0+.

**Fix:** Pull the latest TAI and re-run install, or remove inline comments from project.yaml.

### Hooks don't fire

**Cause:** `.claude/settings.local.json` doesn't exist or doesn't contain hooks.

**Fix:** Re-run `.tai-upstream/.tai/hooks/install.sh`. Then restart your Claude session — Claude Code loads settings at session start.

### "Cannot find package 'yaml'"

**Cause:** `bun install` was not run in the TAI directory.

**Fix:** `cd .tai-upstream && bun install`

### Statusline shows but never updates

**Cause:** `settings.local.json` was created or changed mid-session.

**Fix:** Restart your Claude session. Claude Code picks up statusline changes on session start.

### "detached HEAD" when pulling TAI updates

**Cause:** TAI was cloned or checked out without tracking a branch.

**Fix:** `cd .tai-upstream && git checkout main && git pull`

## What Gets Installed

```
your-project/
├── .tai-upstream/           # TAI framework (git repo, pull to update)
│   └── .tai/
│       ├── hooks/           # Hook scripts + statusline
│       ├── skills/          # Skill packages
│       ├── agents/          # Agent definitions
│       ├── roles/           # Role context files
│       ├── CORE.md          # Session protocol
│       └── VERSION          # TAI version
├── .tai/                    # Instance data (project-owned, never overwritten)
│   ├── config/              # team.yaml, project.yaml
│   ├── context/             # architecture.md, boundaries.md, patterns.md, sprint-current.md
│   ├── memory/              # decisions/, learnings/, state/, signals/, failures/
│   └── roles/               # dev.md, qa.md, pub.md, admin.md
├── .claude/
│   ├── settings.local.json  # Hook registrations + statusline config
│   ├── rules/tai.md         # Session initialization rules
│   └── commands/            # /tai-validate, /tai-admin, /tai-sprint, /tai-decisions, /tai-health
└── .git/hooks/
    ├── pre-commit → .tai/hooks/pre-commit.sh
    └── pre-push → .tai/hooks/pre-push.sh
```
