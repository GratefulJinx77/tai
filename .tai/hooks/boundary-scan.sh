#!/usr/bin/env bash
# TAI Boundary Scanner
# Reads FORBIDDEN IMPORTS from .tai/context/boundaries.md and checks staged files
# for violations. Exits 1 if any violation is found.

set -euo pipefail

TAI_ROOT="$(git rev-parse --show-toplevel)/.tai"
BOUNDARIES_FILE="$TAI_ROOT/context/boundaries.md"
TELEMETRY_FILE="$TAI_ROOT/telemetry/boundaries.jsonl"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
GIT_USER="$(git config user.name 2>/dev/null || echo "unknown")"

# Resolve role from TAI_ROLE env, team.yaml, or default
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

if [ ! -f "$BOUNDARIES_FILE" ]; then
    echo "TAI: No boundaries file found at $BOUNDARIES_FILE — skipping boundary scan."
    exit 0
fi

# Parse forbidden import rules from boundaries.md
# Format: source/path/** → target/path/**
parse_rules() {
    local in_rules=0
    while IFS= read -r line; do
        if echo "$line" | grep -q "^FORBIDDEN IMPORTS:"; then
            in_rules=1
            continue
        fi
        if [ "$in_rules" -eq 1 ]; then
            # Stop at next heading or empty non-indented line after rules
            if echo "$line" | grep -q "^[A-Z#]"; then
                break
            fi
            # Skip comments and empty lines
            if echo "$line" | grep -qE '^\s*#|^\s*$'; then
                continue
            fi
            # Extract source → target rule
            local source target
            source="$(echo "$line" | sed 's/→.*//' | sed 's/^[ \t]*//' | sed 's/[ \t]*$//')"
            target="$(echo "$line" | sed 's/.*→//' | sed 's/^[ \t]*//' | sed 's/[ \t]*$//')"
            if [ -n "$source" ] && [ -n "$target" ]; then
                echo "$source|$target"
            fi
        fi
    done < "$BOUNDARIES_FILE"
}

# Convert glob pattern to grep regex
glob_to_regex() {
    local pattern="$1"
    # Escape dots, convert ** to .*, convert * to [^/]*
    echo "$pattern" | sed 's/\./\\./g' | sed 's/\*\*/.*/g' | sed 's/\*/[^\/]*/g'
}

RULES="$(parse_rules)"

if [ -z "$RULES" ]; then
    exit 0
fi

# Get staged files
STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)"

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

VIOLATIONS=0

while IFS='|' read -r source_glob target_glob; do
    source_regex="$(glob_to_regex "$source_glob")"
    target_regex="$(glob_to_regex "$target_glob")"

    # Find staged files matching the source glob
    matching_files="$(echo "$STAGED_FILES" | grep -E "^$source_regex" 2>/dev/null || true)"

    if [ -z "$matching_files" ]; then
        continue
    fi

    while IFS= read -r file; do
        if [ ! -f "$file" ]; then
            continue
        fi

        # Resolve what the target path looks like relative to this source file
        # e.g., source=src/services/extraction/foo.js, target=src/services/pricing/**
        # The relative import would be ../pricing/...
        file_dir="$(dirname "$file")"
        target_base="$(echo "$target_glob" | sed 's/\*\*$//' | sed 's/\/$//')"
        rel_target="$(python3 -c "import os.path; print(os.path.relpath('$target_base', '$file_dir'))" 2>/dev/null || echo "")"
        rel_regex="$(echo "$rel_target" | sed 's/\./\\./g')"

        # Scan for import/require/from statements that match target (absolute or relative)
        matches="$(grep -nE "(import |require\(|require |from )" "$file" 2>/dev/null | grep -E "($target_regex|$rel_regex)" || true)"

        if [ -z "$matches" ]; then
            continue
        fi

        while IFS= read -r match; do
            [ -z "$match" ] && continue
            line_num="$(echo "$match" | cut -d: -f1)"
            line_content="$(echo "$match" | cut -d: -f2-)"

            echo "BOUNDARY VIOLATION:"
            echo "  File:     $file (line $line_num)"
            echo "  Import:   $line_content"
            echo "  Rule:     $source_glob → $target_glob"
            echo ""

            # Log to telemetry
            mkdir -p "$(dirname "$TELEMETRY_FILE")"
            printf '{"timestamp":"%s","event":"boundary.violation","user":"%s","role":"%s","file":"%s","line":%s,"import":"%s","rule":"%s → %s"}\n' \
                "$TIMESTAMP" "$GIT_USER" "$ROLE" "$file" "$line_num" \
                "$(echo "$line_content" | sed 's/"/\\"/g')" \
                "$source_glob" "$target_glob" >> "$TELEMETRY_FILE"

            VIOLATIONS=$((VIOLATIONS + 1))
        done <<< "$matches"
    done <<< "$matching_files"
done <<< "$RULES"

if [ "$VIOLATIONS" -gt 0 ]; then
    echo "TAI: $VIOLATIONS boundary violation(s) found. Commit blocked."
    exit 1
fi

echo "TAI: Boundary scan passed."
exit 0
