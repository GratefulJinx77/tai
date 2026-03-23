#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# TAI Setup — One command to add Team AI Infrastructure to any project
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
#
#   Or locally:
#   bash /path/to/tai/setup.sh
#
# Works for both existing projects and brand new repos.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

TAI_REPO="https://github.com/GratefulJinx77/tai.git"
TAI_DIR=".tai-upstream"

echo ""
echo "═══════════════════════════════════════════════"
echo "  TAI — Team AI Infrastructure Setup"
echo "═══════════════════════════════════════════════"
echo ""

# ── Check prerequisites ──────────────────────────────────────────────────────

_missing=""
command -v git >/dev/null 2>&1 || _missing="${_missing} git"
command -v bun >/dev/null 2>&1 || _missing="${_missing} bun"
command -v jq >/dev/null 2>&1 || _missing="${_missing} jq"
command -v python3 >/dev/null 2>&1 || _missing="${_missing} python3"

if [ -n "$_missing" ]; then
    echo "Missing dependencies:${_missing}"
    echo ""
    echo "Install them first:"
    echo "$_missing" | grep -q "bun" && echo "  bun:     curl -fsSL https://bun.sh/install | bash"
    echo "$_missing" | grep -q "jq" && echo "  jq:      sudo apt install jq (Linux) / brew install jq (macOS)"
    echo "$_missing" | grep -q "python3" && echo "  python3: sudo apt install python3 (Linux) / brew install python3 (macOS)"
    exit 1
fi

# ── Ensure we're in a git repo ───────────────────────────────────────────────

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Not a git repository. Initializing one..."
    git init
    echo ""
fi

# ── Clone or update TAI ──────────────────────────────────────────────────────

if [ -d "$TAI_DIR" ]; then
    echo "Updating existing $TAI_DIR..."
    (cd "$TAI_DIR" && git pull --ff-only 2>/dev/null || true)
else
    echo "Cloning TAI framework..."
    git clone --depth 1 "$TAI_REPO" "$TAI_DIR"
fi

# ── Install dependencies ─────────────────────────────────────────────────────

echo "Installing dependencies..."
(cd "$TAI_DIR" && bun install --silent 2>/dev/null)
(cd "$TAI_DIR/cli" && bun install --silent 2>/dev/null)

# ── Init, Reconfigure, or Update ─────────────────────────────────────────────

# Check for --reconfigure flag
_reconfigure=false
for arg in "$@"; do
    [ "$arg" = "--reconfigure" ] || [ "$arg" = "-r" ] && _reconfigure=true
done

if [ "$_reconfigure" = true ]; then
    # Re-run wizard to update team/project config only
    echo "Reconfiguring TAI — updating team and project settings..."
    echo ""
    exec bun run "$TAI_DIR/cli/src/cli.ts" init --reconfigure
elif [ -d ".tai" ]; then
    # Existing install — update framework and re-register hooks
    echo "Existing .tai/ detected — updating hooks and framework..."
    echo ""
    exec bash "$TAI_DIR/.tai/hooks/install.sh" "$@"
else
    # Fresh install — run interactive wizard
    echo ""
    exec bun run "$TAI_DIR/cli/src/cli.ts" init "$@"
fi
