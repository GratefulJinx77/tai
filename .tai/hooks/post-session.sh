#!/usr/bin/env bash
# TAI Post-Session Hook
# Generates session summary, logs session end, auto-stages telemetry.
# Advisory only — always exits 0.

TAI_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)/.tai" || TAI_ROOT=".tai"
TELEMETRY_DIR="$TAI_ROOT/telemetry"
SESSIONS_FILE="$TELEMETRY_DIR/sessions.jsonl"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
GIT_USER="$(git config user.name 2>/dev/null || echo "unknown")"

# Resolve role
resolve_role() {
    if [ -n "${TAI_ROLE:-}" ]; then
        echo "$TAI_ROLE"
        return
    fi
    local email
    email="$(git config user.email 2>/dev/null || echo "")"
    if [ -n "$email" ] && [ -f "$TAI_ROOT/config/team.yaml" ]; then
        local role
        role="$(grep -A1 "email: $email" "$TAI_ROOT/config/team.yaml" 2>/dev/null | grep "role:" | sed 's/.*role: *//' | head -1)"
        if [ -n "$role" ]; then
            echo "$role"
            return
        fi
    fi
    echo "developer"
}

ROLE="$(resolve_role)"
VERSION="$(cat "$TAI_ROOT/VERSION" 2>/dev/null || echo "unknown")"

# Generate session summary
COMMITS_THIS_SESSION="$(git log --oneline --since="8 hours ago" 2>/dev/null | wc -l | tr -d ' ')"
FILES_CHANGED="$(git diff --name-only HEAD~"${COMMITS_THIS_SESSION:-1}" HEAD 2>/dev/null | wc -l | tr -d ' ')" || FILES_CHANGED="0"

# Write session end event
mkdir -p "$TELEMETRY_DIR"
printf '{"timestamp":"%s","event":"session.end","user":"%s","role":"%s","tai_version":"%s","details":{"commits":%s,"files_changed":%s}}\n' \
    "$TIMESTAMP" "$GIT_USER" "$ROLE" "$VERSION" "$COMMITS_THIS_SESSION" "$FILES_CHANGED" >> "$SESSIONS_FILE"

echo "TAI: Session end logged."
echo "TAI: Session summary — $COMMITS_THIS_SESSION commit(s), $FILES_CHANGED file(s) changed."

# Auto-stage telemetry files for next commit
git add "$TELEMETRY_DIR"/*.jsonl 2>/dev/null || true

echo "TAI: Telemetry files staged."

# Always exit 0 — advisory only
exit 0
