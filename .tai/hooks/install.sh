#!/usr/bin/env bash
# TAI Hook Installer — Framework vs Instance Architecture
#
# TAI separates FRAMEWORK (code in the submodule) from INSTANCE (project data).
#
# FRAMEWORK (submodule — updates via git pull):
#   hooks/, skills/, agents/, CORE.md, PRDFORMAT.md, VERSION, templates/
#
# INSTANCE (project root — never overwritten by updates):
#   .tai/config/     — team.yaml, project.yaml, models.yaml
#   .tai/context/    — architecture.md, boundaries.md, patterns.md, sprint-current.md
#   .tai/memory/     — decisions/, learnings/, state/, signals/, failures/
#   .claude/         — rules/tai.md, commands/*.md, settings.local.json
#
# Usage:
#   .tai-upstream/.tai/hooks/install.sh              # Install required + recommended
#   .tai-upstream/.tai/hooks/install.sh --minimal     # Required hooks only
#   .tai-upstream/.tai/hooks/install.sh --all         # All hooks including optional
#   .tai-upstream/.tai/hooks/install.sh --list        # List all hooks and tiers

set -euo pipefail

# ── Detect paths ─────────────────────────────────────────────────
# FRAMEWORK_DIR = where this script lives (the submodule)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# REPO_ROOT = the actual project root
# show-superproject-working-tree returns empty string (exit 0) when not a submodule,
# so we must check the output, not just the exit code.
_super="$(cd "$FRAMEWORK_DIR" && git rev-parse --show-superproject-working-tree 2>/dev/null)"
if [ -n "$_super" ]; then
    REPO_ROOT="$_super"
else
    REPO_ROOT="$(cd "$FRAMEWORK_DIR" && git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# FRAMEWORK_REL = relative path from REPO_ROOT to FRAMEWORK_DIR
FRAMEWORK_REL="$(python3 -c "import os; print(os.path.relpath('$FRAMEWORK_DIR', '$REPO_ROOT'))" 2>/dev/null || echo ".tai")"

# Instance directories (project-owned)
INSTANCE_DIR="$REPO_ROOT/.tai"
CLAUDE_DIR="$REPO_ROOT/.claude"
GIT_HOOKS="$REPO_ROOT/.git/hooks"

# Framework files
CONFIG="$FRAMEWORK_DIR/hooks/config.yaml"
TEMPLATE="$FRAMEWORK_DIR/hooks/settings-template.json"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"

echo "TAI: Framework at: $FRAMEWORK_REL"
echo "TAI: Project at:   $REPO_ROOT"
echo ""

if [ ! -f "$CONFIG" ]; then
    echo "TAI: Hook config not found at $CONFIG"
    exit 1
fi

MODE="${1:-default}"

# ── List mode ─────────────────────────────────────────────────────
if [ "$MODE" = "--list" ]; then
    echo "TAI Hook Registry (from config.yaml):"
    echo ""
    printf "  %-25s %-15s %-20s %s\n" "HOOK" "TIER" "EVENT" "CATEGORY"
    printf "  %-25s %-15s %-20s %s\n" "----" "----" "-----" "--------"

    current_hook=""
    current_category=""
    tier=""
    event=""
    while IFS= read -r line; do
        # Category from comment headers (e.g., "  # ─── Memory Hooks")
        if echo "$line" | grep -qE '^  #.*Hooks'; then
            current_category=$(echo "$line" | sed 's/.*# [─ ]*//' | sed 's/ Hooks.*//' | sed 's/(.*)//' | tr '[:upper:]' '[:lower:]' | xargs)
        fi
        # Hook name = map key at 2-space indent (e.g., "  LoadContext:")
        if echo "$line" | grep -qE '^  [A-Za-z][A-Za-z0-9_-]*:$'; then
            current_hook=$(echo "$line" | sed 's/://;s/^ *//')
            tier=""
            event=""
        fi
        if [ -n "$current_hook" ]; then
            if echo "$line" | grep -qE '^\s+tier:'; then
                tier=$(echo "$line" | sed 's/.*tier: *//')
            fi
            if echo "$line" | grep -qE '^\s+event:'; then
                event=$(echo "$line" | sed 's/.*event: *//')
            fi
            # Print when we have all fields (event is last required field)
            if [ -n "$tier" ] && [ -n "$event" ]; then
                printf "  %-25s %-15s %-20s %s\n" "$current_hook" "$tier" "$event" "$current_category"
                current_hook=""
                tier=""
                event=""
            fi
        fi
    done < "$CONFIG"
    exit 0
fi

# ── Determine which tiers to install ──────────────────────────────
INSTALL_REQUIRED=true
INSTALL_RECOMMENDED=false
INSTALL_OPTIONAL=false

case "$MODE" in
    --minimal)
        echo "TAI: Installing required hooks only (--minimal)"
        ;;
    --all)
        INSTALL_RECOMMENDED=true
        INSTALL_OPTIONAL=true
        echo "TAI: Installing all hooks (--all)"
        ;;
    *)
        INSTALL_RECOMMENDED=true
        echo "TAI: Installing required + recommended hooks"
        ;;
esac

# ── Make framework hook scripts executable ────────────────────────
chmod +x "$FRAMEWORK_DIR/hooks/"*.sh 2>/dev/null || true
chmod +x "$FRAMEWORK_DIR/hooks/"*.hook.ts 2>/dev/null || true

# ── Scaffold instance directory (project-owned, never overwrite) ──
echo "TAI: Scaffolding project instance files..."

# Config — copy templates only if files don't exist
mkdir -p "$INSTANCE_DIR/config"
for cfg in team.yaml project.yaml models.yaml; do
    if [ ! -f "$INSTANCE_DIR/config/$cfg" ]; then
        if [ -f "$FRAMEWORK_DIR/config/$cfg" ]; then
            cp "$FRAMEWORK_DIR/config/$cfg" "$INSTANCE_DIR/config/$cfg"
            echo "TAI: Created config/$cfg (from template)"
        fi
    else
        echo "TAI: config/$cfg exists (not overwritten)"
    fi
done

# Context — check for bootstrap opportunity BEFORE copying templates
mkdir -p "$INSTANCE_DIR/context"
_needs_bootstrap=false
if [ -f "$REPO_ROOT/CLAUDE.md" ]; then
    _claude_size=$(wc -c < "$REPO_ROOT/CLAUDE.md" 2>/dev/null || echo 0)
    _arch_exists=false
    [ -f "$INSTANCE_DIR/context/architecture.md" ] && _arch_exists=true

    # Bootstrap if: CLAUDE.md is substantial AND architecture.md doesn't exist yet
    if [ "$_claude_size" -gt 500 ] && [ "$_arch_exists" = false ]; then
        _needs_bootstrap=true
    fi
fi

# Copy templates only if files don't exist
for ctx in architecture.md boundaries.md patterns.md sprint-current.md; do
    if [ ! -f "$INSTANCE_DIR/context/$ctx" ]; then
        if [ -f "$FRAMEWORK_DIR/context/$ctx" ]; then
            cp "$FRAMEWORK_DIR/context/$ctx" "$INSTANCE_DIR/context/$ctx"
            echo "TAI: Created context/$ctx (from template)"
        fi
    else
        echo "TAI: context/$ctx exists (not overwritten)"
    fi
done

# Create bootstrap instruction if needed
if [ "$_needs_bootstrap" = true ]; then
    echo ""
    echo "TAI: Found existing CLAUDE.md (${_claude_size} bytes) with project context."
    echo "TAI: Context files are templates — creating bootstrap instruction."
    echo ""

    cat > "$INSTANCE_DIR/context/.bootstrap-pending" << BOOTSTRAP_EOF
# TAI Context Bootstrap — Auto-generated

This project has an existing CLAUDE.md with rich context that should be
extracted into TAI's context files. On your FIRST session, you MUST:

1. Read the project's CLAUDE.md (at the repo root)
2. Extract architecture information → write to .tai/context/architecture.md
3. Extract boundary/import rules → write to .tai/context/boundaries.md
4. Extract code conventions → write to .tai/context/patterns.md
5. Extract current sprint info → write to .tai/context/sprint-current.md
6. Delete this file (.tai/context/.bootstrap-pending) when done

This is a one-time operation. Do it BEFORE responding to the user's first message.
BOOTSTRAP_EOF
    echo "TAI: Created .bootstrap-pending — Claude will extract context on first session."
fi

# Memory — create directories + copy templates only if missing
mkdir -p "$INSTANCE_DIR/memory/decisions"
mkdir -p "$INSTANCE_DIR/memory/learnings"
mkdir -p "$INSTANCE_DIR/memory/state"
mkdir -p "$INSTANCE_DIR/memory/signals"
mkdir -p "$INSTANCE_DIR/memory/failures"

for mem in decisions/INDEX.md decisions/TEMPLATE.md learnings/summary.md state/current.md; do
    if [ ! -f "$INSTANCE_DIR/memory/$mem" ]; then
        if [ -f "$FRAMEWORK_DIR/memory/$mem" ]; then
            cp "$FRAMEWORK_DIR/memory/$mem" "$INSTANCE_DIR/memory/$mem"
            echo "TAI: Created memory/$mem (from template)"
        fi
    fi
done

# Memory README
if [ ! -f "$INSTANCE_DIR/memory/README.md" ] && [ -f "$FRAMEWORK_DIR/memory/README.md" ]; then
    cp "$FRAMEWORK_DIR/memory/README.md" "$INSTANCE_DIR/memory/README.md"
fi

# Roles — copy from framework
mkdir -p "$INSTANCE_DIR/roles"
for role in dev.md qa.md pub.md admin.md; do
    if [ ! -f "$INSTANCE_DIR/roles/$role" ]; then
        if [ -f "$FRAMEWORK_DIR/roles/$role" ]; then
            cp "$FRAMEWORK_DIR/roles/$role" "$INSTANCE_DIR/roles/$role"
            echo "TAI: Created roles/$role (from template)"
        fi
    fi
done

# .gitignore for selective memory tracking
if [ ! -f "$INSTANCE_DIR/.gitignore" ]; then
    cat > "$INSTANCE_DIR/.gitignore" << 'GITIGNORE_EOF'
# Decisions are committed (shared team knowledge)
# Everything else is ephemeral

# Ephemeral memory
memory/learnings/*.jsonl
memory/signals/*.jsonl
memory/failures/
memory/state/pre-compact-*.json
memory/state/session-*.json
memory/state/work.json
memory/state/model-cache.txt
memory/state/session-name-cache.sh
memory/state/*.bak
memory/state/system-counts.json
memory/state/tai-metrics.json
memory/state/counts-cache.sh
memory/state/last-response.txt

# Agent memory (per-machine)
agent-memory/
GITIGNORE_EOF
    echo "TAI: Created .gitignore (decisions committed, ephemera ignored)"
fi

# Symlink framework references so .tai/hooks, .tai/skills, .tai/agents resolve
# These let paths like .tai/hooks/LoadContext.hook.ts work from the project root
for dir in hooks skills agents CORE.md PRDFORMAT.md CONTEXT_ROUTING.md VERSION status-line.md packages.yaml templates docs; do
    TARGET="$INSTANCE_DIR/$dir"
    SOURCE="$FRAMEWORK_DIR/$dir"
    if [ -e "$SOURCE" ] && [ ! -e "$TARGET" ]; then
        ln -sf "$SOURCE" "$TARGET"
        echo "TAI: Linked $dir → framework"
    fi
done

echo ""

# ── Install Claude Code rules file ───────────────────────────────
RULES_DIR="$CLAUDE_DIR/rules"
mkdir -p "$RULES_DIR"

cat > "$RULES_DIR/tai.md" << 'RULES_EOF'
# TAI — Team AI Infrastructure

## Session Initialization

At the START of every session, perform these steps before responding:

1. Read `.tai/CORE.md` for the session protocol
2. Read `.tai/config/team.yaml` — identify user by `git config user.email`
3. Read the user's role file from `.tai/roles/{role}.md` (default: dev.md)
4. Read `.tai/memory/decisions/INDEX.md` — active team decisions
5. Read `.tai/memory/state/current.md` — active sprint and work
6. Read `.tai/context/architecture.md`, `.tai/context/boundaries.md`, `.tai/context/patterns.md`
7. Check if `.tai/context/.bootstrap-pending` exists — if so, read it and follow its instructions to populate context files from the project's CLAUDE.md, then delete the file

The terminal statusline is handled by the bash statusline script — do NOT output your own statusline.

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
RULES_EOF

echo "TAI: Installed .claude/rules/tai.md"

# ── Install slash commands ────────────────────────────────────────
COMMANDS_DIR="$CLAUDE_DIR/commands"
mkdir -p "$COMMANDS_DIR"

cat > "$COMMANDS_DIR/tai-validate.md" << 'CMD_EOF'
---
description: "Validate TAI installation — checks all components"
allowed-tools: [Bash, Read, Glob, Grep]
---

Read `.tai/skills/core/tai-validate.md` and follow its instructions exactly. Run all validation checks and display the summary table.
CMD_EOF

cat > "$COMMANDS_DIR/tai-admin.md" << 'CMD_EOF'
---
description: "Switch to TAI Admin mode for system configuration"
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep]
---

Read `.tai/skills/core/tai-admin.md` and follow its instructions exactly.
CMD_EOF

cat > "$COMMANDS_DIR/tai-sprint.md" << 'CMD_EOF'
---
description: "Show current sprint status and ISC progress"
allowed-tools: [Bash, Read]
---

Read `.tai/context/sprint-current.md` and display the sprint name, dates, objectives, and ISC progress (count checked vs unchecked checkboxes). Format as a clean status display.
CMD_EOF

cat > "$COMMANDS_DIR/tai-decisions.md" << 'CMD_EOF'
---
description: "Show active team decisions"
allowed-tools: [Read, Glob]
---

Read `.tai/memory/decisions/INDEX.md` and list all active decisions. For each, show the date and one-line summary.
CMD_EOF

cat > "$COMMANDS_DIR/tai-health.md" << 'CMD_EOF'
---
description: "Show project health — hooks, boundaries, test status"
allowed-tools: [Bash, Read, Glob, Grep]
---

Read `.tai/skills/core/query/tai-health.md` if it exists. Otherwise: run the project's test command from `.tai/config/project.yaml`, check git hook status, count boundary violations in `.tai/telemetry/boundaries.jsonl`, and report results.
CMD_EOF

echo "TAI: Installed slash commands: /tai-validate, /tai-admin, /tai-sprint, /tai-decisions, /tai-health"

# ── Install git hooks (symlinks to framework) ─────────────────────
if [ -d "$GIT_HOOKS" ]; then
    for hook in pre-commit pre-push; do
        SOURCE="$FRAMEWORK_DIR/hooks/${hook}.sh"
        TARGET="$GIT_HOOKS/$hook"

        if [ ! -f "$SOURCE" ]; then
            continue
        fi

        if [ -f "$TARGET" ] && [ ! -L "$TARGET" ]; then
            echo "TAI: Backing up existing $hook hook to ${hook}.bak"
            mv "$TARGET" "${TARGET}.bak"
        fi

        ln -sf "$SOURCE" "$TARGET"
        echo "TAI: Installed git hook: $hook"
    done
fi

# ── Register Claude Code hooks ────────────────────────────────────
echo ""
echo "TAI: Registering Claude Code hooks..."
mkdir -p "$CLAUDE_DIR"

# Collect which hooks to install based on tier
declare -A INSTALL_HOOKS

current_hook=""
while IFS= read -r line; do
    # Hook name = map key at 2-space indent
    if echo "$line" | grep -qE '^  [A-Za-z][A-Za-z0-9_-]*:$'; then
        current_hook=$(echo "$line" | sed 's/://;s/^ *//')
    fi
    if [ -n "${current_hook:-}" ] && echo "$line" | grep -qE '^\s+tier:'; then
        tier=$(echo "$line" | sed 's/.*tier: *//')
        should_install=false
        case "$tier" in
            required)    $INSTALL_REQUIRED && should_install=true ;;
            recommended) $INSTALL_RECOMMENDED && should_install=true ;;
            optional)    $INSTALL_OPTIONAL && should_install=true ;;
        esac
        if $should_install; then
            INSTALL_HOOKS["$current_hook"]=1
        fi
        current_hook=""
    fi
done < "$CONFIG"

# Build settings.local.json with hook paths pointing to framework
# The .tai/hooks/ symlink resolves to framework, so paths work
if [ -f "$TEMPLATE" ]; then
    if command -v python3 &>/dev/null; then
        python3 -c "
import json

template_path = '$TEMPLATE'
settings_path = '$SETTINGS_FILE'

# Read template
with open(template_path, 'r') as f:
    template = json.load(f)

# Read existing settings if they exist
settings = {}
try:
    with open(settings_path, 'r') as f:
        settings = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    pass

# Filter hooks based on tier
install_hooks = set('''$(printf '%s\n' "${!INSTALL_HOOKS[@]}")'''.split())

filtered_hooks = {}
for event, matchers in template.get('hooks', {}).items():
    filtered_matchers = []
    for matcher in matchers:
        filtered_commands = []
        for hook in matcher.get('hooks', []):
            cmd = hook.get('command', '')
            hook_name = cmd.split('/')[-1].replace('.hook.ts', '').replace('bun run .tai/hooks/', '')
            if hook_name in install_hooks or not install_hooks:
                filtered_commands.append(hook)
        if filtered_commands:
            filtered_matchers.append({**matcher, 'hooks': filtered_commands})
    if filtered_matchers:
        filtered_hooks[event] = filtered_matchers

settings['hooks'] = filtered_hooks
settings['statusLine'] = {
    'type': 'command',
    'command': '.tai/hooks/statusline-command.sh'
}

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')

print(f'TAI: Registered {len(filtered_hooks)} hook events + statusLine')
" 2>/dev/null
    else
        cp "$TEMPLATE" "$SETTINGS_FILE"
        echo "TAI: Claude Code hooks written (install python3 for filtered merge)"
    fi
else
    echo "TAI: Warning — settings-template.json not found"
fi

# ── Count and report ──────────────────────────────────────────────
REQUIRED=0
RECOMMENDED=0
OPTIONAL=0
INSTALLED=0

current_hook=""
while IFS= read -r line; do
    # Hook name = map key at 2-space indent
    if echo "$line" | grep -qE '^  [A-Za-z][A-Za-z0-9_-]*:$'; then
        current_hook=$(echo "$line" | sed 's/://;s/^ *//')
    fi
    if [ -n "${current_hook:-}" ] && echo "$line" | grep -qE '^\s+tier:'; then
        tier=$(echo "$line" | sed 's/.*tier: *//')
        case "$tier" in
            required)
                REQUIRED=$((REQUIRED + 1))
                $INSTALL_REQUIRED && INSTALLED=$((INSTALLED + 1))
                ;;
            recommended)
                RECOMMENDED=$((RECOMMENDED + 1))
                $INSTALL_RECOMMENDED && INSTALLED=$((INSTALLED + 1))
                ;;
            optional)
                OPTIONAL=$((OPTIONAL + 1))
                $INSTALL_OPTIONAL && INSTALLED=$((INSTALLED + 1))
                ;;
        esac
        current_hook=""
    fi
done < "$CONFIG"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  TAI v$(cat "$FRAMEWORK_DIR/VERSION" 2>/dev/null || echo "?.?.?") Installation Complete"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Framework:     $FRAMEWORK_REL (submodule)"
echo "  Instance:      .tai/ (project-owned, safe from updates)"
echo ""
echo "  Hooks:         $INSTALLED active ($REQUIRED required, $RECOMMENDED recommended, $OPTIONAL optional)"
echo "  Git hooks:     .git/hooks/ (pre-commit, pre-push)"
echo "  Claude hooks:  .claude/settings.local.json"
echo "  Rules:         .claude/rules/tai.md"
echo "  Commands:      /tai-validate, /tai-admin, /tai-sprint, /tai-decisions, /tai-health"
echo ""
echo "  Next steps:"
echo "    1. Edit .tai/config/team.yaml — add team members"
echo "    2. Edit .tai/context/ files — describe your architecture"
echo "    3. Launch claude"
echo ""
echo "  Submodule updates (git pull in $FRAMEWORK_REL) will NEVER"
echo "  overwrite your config, context, or memory files."
echo ""

exit 0
