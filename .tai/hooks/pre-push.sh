#!/usr/bin/env bash
# TAI Pre-Push Hook
# Runs full test suite before push. Exits non-zero if tests fail.

set -euo pipefail

TAI_ROOT="$(git rev-parse --show-toplevel)/.tai"
PROJECT_YAML="$TAI_ROOT/config/project.yaml"
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

read_command() {
    local key="$1"
    local val=""
    if [ -f "$PROJECT_YAML" ]; then
        val=$(grep "^    ${key}:" "$PROJECT_YAML" 2>/dev/null \
            | sed "s/^    ${key}: *//" \
            | sed 's/ *#.*//' \
            | sed 's/^"//;s/"$//' \
            | sed "s/^'//;s/'$//" \
            | xargs)
    fi
    if [ -n "$val" ]; then echo "$val"; fi
}

log_event() {
    local result="$1"
    local details="$2"
    mkdir -p "$(dirname "$TELEMETRY_FILE")"
    printf '{"timestamp":"%s","event":"hook.pre-push","user":"%s","role":"%s","result":"%s","details":{%s}}\n' \
        "$TIMESTAMP" "$GIT_USER" "$ROLE" "$result" "$details" >> "$TELEMETRY_FILE"
}

TEST_CMD="$(read_command "test")"
if [ -n "$TEST_CMD" ]; then
    echo "TAI: Running test suite..."
    if eval "$TEST_CMD"; then
        echo "TAI: Tests passed."
        log_event "pass" "\"test\":\"pass\""
        exit 0
    else
        echo "TAI: Tests FAILED. Push blocked."
        log_event "fail" "\"test\":\"fail\""
        exit 1
    fi
else
    echo "TAI: No test command configured — skipping tests."
    log_event "pass" "\"test\":\"skipped\""
    exit 0
fi
