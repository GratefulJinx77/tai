#!/usr/bin/env bash
# TAI Pre-Commit Hook
# Runs linter, type checker, and boundary scan on staged files.
# Exits non-zero if any check fails.

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

# Read a command from project.yaml
read_command() {
    local key="$1"
    if [ -f "$PROJECT_YAML" ]; then
        grep "^    ${key}:" "$PROJECT_YAML" 2>/dev/null | sed "s/^    ${key}: *//" | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//"
    fi
}

log_event() {
    local result="$1"
    local details="$2"
    mkdir -p "$(dirname "$TELEMETRY_FILE")"
    printf '{"timestamp":"%s","event":"hook.pre-commit","user":"%s","role":"%s","result":"%s","details":{%s}}\n' \
        "$TIMESTAMP" "$GIT_USER" "$ROLE" "$result" "$details" >> "$TELEMETRY_FILE"
}

FAILED=0
DETAILS=""

# Step 1: Lint
LINT_CMD="$(read_command "lint")"
if [ -n "$LINT_CMD" ]; then
    echo "TAI: Running linter..."
    if eval "$LINT_CMD"; then
        echo "TAI: Lint passed."
    else
        echo "TAI: Lint FAILED."
        FAILED=1
        DETAILS="\"lint\":\"fail\""
    fi
else
    echo "TAI: No lint command configured — skipping."
fi

# Step 2: Type check
TYPE_CMD="$(read_command "type_check")"
if [ -n "$TYPE_CMD" ]; then
    echo "TAI: Running type checker..."
    if eval "$TYPE_CMD"; then
        echo "TAI: Type check passed."
    else
        echo "TAI: Type check FAILED."
        FAILED=1
        DETAILS="${DETAILS:+$DETAILS,}\"type_check\":\"fail\""
    fi
else
    echo "TAI: No type_check command configured — skipping."
fi

# Step 3: Boundary scan
BOUNDARY_SCRIPT="$TAI_ROOT/hooks/boundary-scan.sh"
if [ -x "$BOUNDARY_SCRIPT" ]; then
    echo "TAI: Running boundary scan..."
    if "$BOUNDARY_SCRIPT"; then
        echo "TAI: Boundary scan passed."
    else
        echo "TAI: Boundary scan FAILED."
        FAILED=1
        DETAILS="${DETAILS:+$DETAILS,}\"boundary_scan\":\"fail\""
        # Notify on boundary violation
        NOTIFY_SCRIPT="$TAI_ROOT/hooks/notify.sh"
        if [ -x "$NOTIFY_SCRIPT" ]; then
            "$NOTIFY_SCRIPT" "boundary_violation" "Boundary violation detected in pre-commit scan by $GIT_USER" &
        fi
    fi
else
    echo "TAI: Boundary scan script not found or not executable — skipping."
fi

# Log result
if [ "$FAILED" -ne 0 ]; then
    log_event "fail" "$DETAILS"
    echo "TAI: Pre-commit checks FAILED. Commit blocked."
    exit 1
else
    log_event "pass" "\"lint\":\"pass\",\"type_check\":\"pass\",\"boundary_scan\":\"pass\""
    echo "TAI: Pre-commit checks passed."
    exit 0
fi
