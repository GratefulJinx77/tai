#!/usr/bin/env bash
# TAI Hook Installer
# Makes all hook scripts executable and installs them as git hooks.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
TAI_HOOKS="$REPO_ROOT/.tai/hooks"
GIT_HOOKS="$REPO_ROOT/.git/hooks"

if [ ! -d "$TAI_HOOKS" ]; then
    echo "TAI: Hook directory not found at $TAI_HOOKS"
    exit 1
fi

if [ ! -d "$GIT_HOOKS" ]; then
    echo "TAI: Git hooks directory not found at $GIT_HOOKS"
    exit 1
fi

# Make all hook scripts executable
chmod +x "$TAI_HOOKS"/*.sh

echo "TAI: All hook scripts marked executable."

# Install git hooks via symlink
# Map: pre-commit.sh → .git/hooks/pre-commit
#       pre-push.sh  → .git/hooks/pre-push
HOOK_MAP="pre-commit pre-push"

for hook in $HOOK_MAP; do
    SOURCE="$TAI_HOOKS/${hook}.sh"
    TARGET="$GIT_HOOKS/$hook"

    if [ ! -f "$SOURCE" ]; then
        echo "TAI: WARNING — $SOURCE not found, skipping."
        continue
    fi

    # Back up existing hook if it's not already a TAI symlink
    if [ -f "$TARGET" ] && [ ! -L "$TARGET" ]; then
        echo "TAI: Backing up existing $hook hook to ${hook}.bak"
        mv "$TARGET" "${TARGET}.bak"
    fi

    # Create symlink (use relative path for portability)
    ln -sf "$SOURCE" "$TARGET"
    echo "TAI: Installed $hook → $(basename "$SOURCE")"
done

# Verify installation
echo ""
echo "TAI: Hook installation verification:"
PASS=0
TOTAL=0
for hook in $HOOK_MAP; do
    TOTAL=$((TOTAL + 1))
    TARGET="$GIT_HOOKS/$hook"
    if [ -L "$TARGET" ] || [ -x "$TARGET" ]; then
        echo "  [OK] $hook"
        PASS=$((PASS + 1))
    else
        echo "  [FAIL] $hook"
    fi
done

echo ""
if [ "$PASS" -eq "$TOTAL" ]; then
    echo "TAI: All $TOTAL hooks installed successfully."
else
    echo "TAI: WARNING — $PASS/$TOTAL hooks installed."
    exit 1
fi

exit 0
