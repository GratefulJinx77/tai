#!/usr/bin/env bash
# TAI Bypass Handler
# Detects --no-verify usage and requires a mandatory reason string.
# Logs bypass events to telemetry.

set -euo pipefail

TAI_ROOT="$(git rev-parse --show-toplevel)/.tai"
TELEMETRY_FILE="$TAI_ROOT/telemetry/hooks.jsonl"
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

# Accept reason from environment, argument, or prompt interactively
BYPASS_REASON="${TAI_BYPASS_REASON:-${1:-}}"

if [ -z "$BYPASS_REASON" ]; then
    # Interactive prompt
    if [ -t 0 ]; then
        echo "TAI: Hook bypass detected (--no-verify)."
        echo "TAI: A reason is MANDATORY for audit purposes."
        printf "TAI: Enter bypass reason: "
        read -r BYPASS_REASON
    fi
fi

if [ -z "$BYPASS_REASON" ]; then
    echo "TAI: ERROR — No bypass reason provided. Bypass reason is mandatory."
    echo "TAI: Set TAI_BYPASS_REASON env var or pass as argument."
    exit 1
fi

# Log bypass event
mkdir -p "$(dirname "$TELEMETRY_FILE")"
printf '{"timestamp":"%s","event":"hook.bypass","user":"%s","role":"%s","bypass_reason":"%s"}\n' \
    "$TIMESTAMP" "$GIT_USER" "$ROLE" \
    "$(echo "$BYPASS_REASON" | sed 's/"/\\"/g')" >> "$TELEMETRY_FILE"

echo "TAI: Bypass logged — reason: $BYPASS_REASON"

# Notify on bypass detected
NOTIFY_SCRIPT="$TAI_ROOT/hooks/notify.sh"
if [ -x "$NOTIFY_SCRIPT" ]; then
    "$NOTIFY_SCRIPT" "hook_bypass" "Hook bypass by $GIT_USER. Reason: $BYPASS_REASON" &
fi

exit 0
