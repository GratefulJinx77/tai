#!/usr/bin/env bash
# TAI Pre-PR Hook
# Runs all pre-commit checks, test suite, build, and validates PR description.
# Exits non-zero if any step fails.

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
    if [ -f "$PROJECT_YAML" ]; then
        grep "^    ${key}:" "$PROJECT_YAML" 2>/dev/null | sed "s/^    ${key}: *//" | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//"
    fi
}

log_event() {
    local result="$1"
    local details="$2"
    mkdir -p "$(dirname "$TELEMETRY_FILE")"
    printf '{"timestamp":"%s","event":"hook.pre-pr","user":"%s","role":"%s","result":"%s","details":{%s}}\n' \
        "$TIMESTAMP" "$GIT_USER" "$ROLE" "$result" "$details" >> "$TELEMETRY_FILE"
}

FAILED=0
DETAILS=""

# Step 1: Run pre-commit checks (lint + type check + boundary scan)
PRE_COMMIT_SCRIPT="$TAI_ROOT/hooks/pre-commit.sh"
if [ -x "$PRE_COMMIT_SCRIPT" ]; then
    echo "TAI [pre-pr]: Running pre-commit checks..."
    if "$PRE_COMMIT_SCRIPT"; then
        echo "TAI [pre-pr]: Pre-commit checks passed."
    else
        echo "TAI [pre-pr]: Pre-commit checks FAILED."
        FAILED=1
        DETAILS="\"pre_commit\":\"fail\""
    fi
else
    echo "TAI [pre-pr]: Pre-commit script not found — skipping."
fi

# Step 2: Run test suite (pre-push)
PRE_PUSH_SCRIPT="$TAI_ROOT/hooks/pre-push.sh"
if [ -x "$PRE_PUSH_SCRIPT" ]; then
    echo "TAI [pre-pr]: Running test suite..."
    if "$PRE_PUSH_SCRIPT"; then
        echo "TAI [pre-pr]: Tests passed."
    else
        echo "TAI [pre-pr]: Tests FAILED."
        FAILED=1
        DETAILS="${DETAILS:+$DETAILS,}\"tests\":\"fail\""
    fi
else
    echo "TAI [pre-pr]: Pre-push script not found — skipping."
fi

# Step 3: Build
BUILD_CMD="$(read_command "build")"
if [ -n "$BUILD_CMD" ]; then
    echo "TAI [pre-pr]: Running build..."
    if eval "$BUILD_CMD"; then
        echo "TAI [pre-pr]: Build passed."
    else
        echo "TAI [pre-pr]: Build FAILED."
        FAILED=1
        DETAILS="${DETAILS:+$DETAILS,}\"build\":\"fail\""
    fi
else
    echo "TAI [pre-pr]: No build command configured — skipping."
fi

# Step 4: Validate PR description
# Accepts PR_DESCRIPTION env var or first argument
PR_DESC="${PR_DESCRIPTION:-${1:-}}"
if [ -z "$PR_DESC" ]; then
    echo "TAI [pre-pr]: No PR description provided. Set PR_DESCRIPTION env var or pass as argument."
    echo "TAI [pre-pr]: PR description validation FAILED."
    FAILED=1
    DETAILS="${DETAILS:+$DETAILS,}\"pr_description\":\"missing\""
else
    echo "TAI [pre-pr]: PR description present."
fi

# Log result
if [ "$FAILED" -ne 0 ]; then
    log_event "fail" "$DETAILS"
    echo "TAI [pre-pr]: Pre-PR checks FAILED."
    exit 1
else
    log_event "pass" "\"pre_commit\":\"pass\",\"tests\":\"pass\",\"build\":\"pass\",\"pr_description\":\"present\""
    echo "TAI [pre-pr]: All pre-PR checks passed."
    exit 0
fi
