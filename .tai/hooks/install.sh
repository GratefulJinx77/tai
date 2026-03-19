#!/usr/bin/env bash
# TAI Hook Installer
#
# Reads config.yaml to determine which hooks to install based on tier.
# Installs git hooks (pre-commit, pre-push) and generates a Claude Code
# settings snippet for Claude Code hooks.
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
    printf "  %-25s %-15s %-20s %s\n" "HOOK" "TIER" "EVENT" "DESCRIPTION"
    printf "  %-25s %-15s %-20s %s\n" "----" "----" "-----" "-----------"

    # Simple YAML parsing for listing
    current_hook=""
    while IFS= read -r line; do
        # Hook name (top-level key under hooks:)
        if echo "$line" | grep -qE '^  [A-Z][a-zA-Z]+:$'; then
            current_hook=$(echo "$line" | sed 's/://;s/^ *//')
        fi
        if [ -n "$current_hook" ]; then
            if echo "$line" | grep -qE '^\s+tier:'; then
                tier=$(echo "$line" | sed 's/.*tier: *//')
            fi
            if echo "$line" | grep -qE '^\s+event:'; then
                event=$(echo "$line" | sed 's/.*event: *//')
            fi
            if echo "$line" | grep -qE '^\s+description:'; then
                desc=$(echo "$line" | sed 's/.*description: *//')
                printf "  %-25s %-15s %-20s %s\n" "$current_hook" "$tier" "$event" "$desc"
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

# ── Install git hooks ─────────────────────────────────────────────
if [ -d "$GIT_HOOKS" ]; then
    HOOK_MAP="pre-commit pre-push"

    for hook in $HOOK_MAP; do
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

# ── Count installed hooks ─────────────────────────────────────────
REQUIRED=0
RECOMMENDED=0
OPTIONAL=0

current_hook=""
while IFS= read -r line; do
    if echo "$line" | grep -qE '^  [A-Z][a-zA-Z]+:$'; then
        current_hook=$(echo "$line" | sed 's/://;s/^ *//')
    fi
    if [ -n "$current_hook" ] && echo "$line" | grep -qE '^\s+tier:'; then
        tier=$(echo "$line" | sed 's/.*tier: *//')
        case "$tier" in
            required) REQUIRED=$((REQUIRED + 1)) ;;
            recommended) RECOMMENDED=$((RECOMMENDED + 1)) ;;
            optional) OPTIONAL=$((OPTIONAL + 1)) ;;
        esac
        current_hook=""
    fi
done < "$CONFIG"

TOTAL=0
if $INSTALL_REQUIRED; then TOTAL=$((TOTAL + REQUIRED)); fi
if $INSTALL_RECOMMENDED; then TOTAL=$((TOTAL + RECOMMENDED)); fi
if $INSTALL_OPTIONAL; then TOTAL=$((TOTAL + OPTIONAL)); fi

echo ""
echo "TAI: Hook installation complete."
echo "  Required:    $REQUIRED hooks"
echo "  Recommended: $RECOMMENDED hooks"
echo "  Optional:    $OPTIONAL hooks"
echo "  Installing:  $TOTAL hooks"
echo ""
echo "TAI: To register hooks with Claude Code, copy the relevant sections"
echo "     from .tai/hooks/settings-template.json to your settings.json."
echo ""
echo "TAI: Run './install.sh --list' to see all available hooks."

exit 0
