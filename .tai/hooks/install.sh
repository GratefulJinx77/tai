#!/usr/bin/env bash
# TAI Hook Installer
#
# Installs both git hooks (symlinks) and Claude Code hooks (settings.local.json).
# Reads config.yaml to determine which hooks to install based on tier.
#
# Usage:
#   ./install.sh              # Install required + recommended hooks
#   ./install.sh --minimal    # Install required hooks only
#   ./install.sh --all        # Install all hooks (required + recommended + optional)
#   ./install.sh --list       # List all hooks and their tiers

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TAI_DIR="$REPO_ROOT/.tai"
TAI_HOOKS="$TAI_DIR/hooks"
GIT_HOOKS="$REPO_ROOT/.git/hooks"
CONFIG="$TAI_HOOKS/config.yaml"
TEMPLATE="$TAI_HOOKS/settings-template.json"
CLAUDE_DIR="$REPO_ROOT/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"

if [ ! -d "$TAI_HOOKS" ]; then
    echo "TAI: Hook directory not found at $TAI_HOOKS"
    exit 1
fi

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
    while IFS= read -r line; do
        # Category headers (memory:, git:, workflow:, optional:)
        if echo "$line" | grep -qE '^  (memory|git|workflow|optional):$'; then
            current_category=$(echo "$line" | sed 's/://;s/^ *//')
        fi
        if echo "$line" | grep -qE '^    - name:'; then
            current_hook=$(echo "$line" | sed 's/.*name: *//')
        fi
        if [ -n "$current_hook" ]; then
            if echo "$line" | grep -qE '^\s+tier:'; then
                tier=$(echo "$line" | sed 's/.*tier: *//')
            fi
            if echo "$line" | grep -qE '^\s+event:'; then
                event=$(echo "$line" | sed 's/.*event: *//')
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

# ── Make all hook scripts executable ──────────────────────────────
chmod +x "$TAI_HOOKS"/*.sh 2>/dev/null || true
chmod +x "$TAI_HOOKS"/*.hook.ts 2>/dev/null || true
echo "TAI: All hook scripts marked executable."

# ── Install git hooks (symlinks) ─────────────────────────────────
if [ -d "$GIT_HOOKS" ]; then
    for hook in pre-commit pre-push; do
        SOURCE="$TAI_HOOKS/${hook}.sh"
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

# Ensure .claude directory exists
mkdir -p "$CLAUDE_DIR"

# Build the hooks JSON based on selected tiers
# We'll parse the settings-template.json and filter by tier from config.yaml

# First, collect which hooks to install based on tier
declare -A INSTALL_HOOKS

while IFS= read -r line; do
    if echo "$line" | grep -qE '^    - name:'; then
        current_hook=$(echo "$line" | sed 's/.*name: *//')
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

# Now build a filtered settings-template.json
# We use a simple approach: copy the template but only include hooks that are in INSTALL_HOOKS

if [ -f "$TEMPLATE" ]; then
    # Create or merge into settings.local.json
    if [ -f "$SETTINGS_FILE" ]; then
        # Read existing settings — merge hooks section
        # Use python/node if available, fallback to simple replacement
        if command -v python3 &>/dev/null; then
            python3 -c "
import json, sys

# Read existing settings
with open('$SETTINGS_FILE', 'r') as f:
    settings = json.load(f)

# Read template
with open('$TEMPLATE', 'r') as f:
    template = json.load(f)

# Filter hooks based on installed hooks
install_hooks = set('''$(printf '%s\n' "${!INSTALL_HOOKS[@]}")'''.split())

filtered_hooks = {}
for event, matchers in template.get('hooks', {}).items():
    filtered_matchers = []
    for matcher in matchers:
        filtered_commands = []
        for hook in matcher.get('hooks', []):
            cmd = hook.get('command', '')
            # Extract hook name from command
            hook_name = cmd.split('/')[-1].replace('.hook.ts', '').replace('bun run .tai/hooks/', '')
            if hook_name in install_hooks or not install_hooks:
                filtered_commands.append(hook)
        if filtered_commands:
            filtered_matchers.append({**matcher, 'hooks': filtered_commands})
    if filtered_matchers:
        filtered_hooks[event] = filtered_matchers

# Merge hooks into existing settings
settings['hooks'] = filtered_hooks

with open('$SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')

print(f'TAI: Merged {len(filtered_hooks)} hook events into {sys.argv[0] if len(sys.argv) > 0 else \"settings.local.json\"}')" 2>/dev/null
            echo "TAI: Claude Code hooks registered in $SETTINGS_FILE"
        else
            # Fallback: just copy the template as the hooks section
            cp "$TEMPLATE" "$SETTINGS_FILE"
            echo "TAI: Claude Code hooks written to $SETTINGS_FILE (full template — install python3 for filtered merge)"
        fi
    else
        # No existing settings — create from filtered template
        if command -v python3 &>/dev/null; then
            python3 -c "
import json

with open('$TEMPLATE', 'r') as f:
    template = json.load(f)

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

settings = {'hooks': filtered_hooks}

# Remove schema and comment from output
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')

print(f'TAI: Created {\"$SETTINGS_FILE\"} with {len(filtered_hooks)} hook events')" 2>/dev/null
        else
            cp "$TEMPLATE" "$SETTINGS_FILE"
            echo "TAI: Claude Code hooks written to $SETTINGS_FILE"
        fi
    fi
else
    echo "TAI: Warning — settings-template.json not found. Claude Code hooks not registered."
fi

# ── Count installed hooks ─────────────────────────────────────────
REQUIRED=0
RECOMMENDED=0
OPTIONAL=0
INSTALLED=0

while IFS= read -r line; do
    if echo "$line" | grep -qE '^    - name:'; then
        current_hook=$(echo "$line" | sed 's/.*name: *//')
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
echo "TAI: Installation complete."
echo "  Required:      $REQUIRED hooks (always installed)"
echo "  Recommended:   $RECOMMENDED hooks (installed by default)"
echo "  Optional:      $OPTIONAL hooks (use --all to install)"
echo "  Total active:  $INSTALLED hooks"
echo ""
echo "  Git hooks:     .git/hooks/ (pre-commit, pre-push)"
echo "  Claude hooks:  $SETTINGS_FILE"
echo ""
echo "TAI: Run './install.sh --list' to see all available hooks."
echo "TAI: Run './install.sh --all' to include optional hooks (Kitty, voice, ratings)."

exit 0
