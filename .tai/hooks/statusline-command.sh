#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# TAI Status Line
# ═══════════════════════════════════════════════════════════════════════════════
#
# Team AI Infrastructure — responsive status line with 4 display modes:
#   - nano   (<35 cols): Minimal single-line displays
#   - micro  (35-54):    Compact with key metrics
#   - mini   (55-79):    Balanced information density
#   - normal (80+):      Full display with sparklines
#
# Ported from PAI statusline-command.sh. Removed:
#   - DA identity / personal AI references
#   - Principal / personal owner references
#   - Anthropic OAuth usage API polling
#   - Personal greeting logic
#   - Voice ID references
#
# Context percentage scales to compaction threshold if configured.
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — find .tai/ relative to git root
# ─────────────────────────────────────────────────────────────────────────────

# Use current_dir from Claude Code input (parsed later) for REPO_ROOT fallback
# Initial REPO_ROOT — may be overridden after JSON parsing
REPO_ROOT="$(git -C "$(pwd)" rev-parse --show-superproject-working-tree 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null || pwd)"
TAI_DIR="$REPO_ROOT/.tai"

# Graceful fallback if .tai/ doesn't exist
if [ ! -d "$TAI_DIR" ]; then
    echo "TAI: .tai/ directory not found"
    exit 0
fi

# Config files
TEAM_CONFIG="$TAI_DIR/config/team.yaml"
PROJECT_CONFIG="$TAI_DIR/config/project.yaml"
VERSION_FILE="$TAI_DIR/VERSION"
HOOKS_CONFIG="$TAI_DIR/hooks/config.yaml"
SPRINT_FILE="$TAI_DIR/context/sprint-current.md"

# Memory paths (lowercase)
RATINGS_FILE="$TAI_DIR/memory/signals/ratings.jsonl"
TREND_CACHE="$TAI_DIR/memory/state/trending-cache.json"
MODEL_CACHE="$TAI_DIR/memory/state/model-cache.txt"
QUOTE_CACHE="$TAI_DIR/.quote-cache"
LOCATION_CACHE="$TAI_DIR/memory/state/location-cache.json"
WEATHER_CACHE="$TAI_DIR/memory/state/weather-cache.json"
COUNTS_CACHE="$TAI_DIR/memory/state/counts-cache.sh"
LEARNING_CACHE="$TAI_DIR/memory/state/learning-cache.sh"
SESSION_NAMES_FILE="$TAI_DIR/memory/state/session-names.json"
SESSION_CACHE="$TAI_DIR/memory/state/session-name-cache.sh"

# Temperature unit preference (default fahrenheit)
TEMP_UNIT="fahrenheit"
if [ -f "$PROJECT_CONFIG" ]; then
    _unit=$(grep -E '^\s*temperatureUnit:' "$PROJECT_CONFIG" 2>/dev/null | sed 's/.*: *//' | tr -d '"' | tr -d "'")
    [ -n "$_unit" ] && TEMP_UNIT="$_unit"
fi
[ "$TEMP_UNIT" != "celsius" ] && TEMP_UNIT="fahrenheit"

# Cache TTL in seconds
LOCATION_CACHE_TTL=31536000  # 1 year
WEATHER_CACHE_TTL=900        # 15 minutes
COUNTS_CACHE_TTL=30          # 30 seconds

# Cross-platform file mtime (seconds since epoch)
get_mtime() {
    stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo 0
}

# ─────────────────────────────────────────────────────────────────────────────
# PARSE INPUT (must happen before parallel block consumes stdin)
# ─────────────────────────────────────────────────────────────────────────────

input=$(cat)

# Get TAI version
TAI_VERSION="—"
[ -f "$VERSION_FILE" ] && TAI_VERSION=$(cat "$VERSION_FILE" 2>/dev/null | head -1)
TAI_VERSION="${TAI_VERSION:-—}"

# Get hook count from config.yaml
HOOK_COUNT=0
if [ -f "$HOOKS_CONFIG" ]; then
    HOOK_COUNT=$(grep -c '^\s*\w.*:$' "$HOOKS_CONFIG" 2>/dev/null | head -1)
    # More reliable: count entries that have a 'file:' key
    _hc=$(grep -c '^\s*file:' "$HOOKS_CONFIG" 2>/dev/null)
    [ "$_hc" -gt 0 ] && HOOK_COUNT="$_hc"
fi

# Get team name from team.yaml
TEAM_NAME=""
if [ -f "$TEAM_CONFIG" ]; then
    TEAM_NAME=$(grep -E '^team_name:|^name:' "$TEAM_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'")
fi
TEAM_NAME="${TEAM_NAME:-Team}"

# Get current user role by matching git email against team.yaml
USER_ROLE=""
if [ -f "$TEAM_CONFIG" ]; then
    _git_email=$(git config user.email 2>/dev/null)
    if [ -n "$_git_email" ]; then
        # Simple YAML parse: find email match, grab preceding role
        USER_ROLE=$(python3 -c "
import sys
try:
    with open('$TEAM_CONFIG') as f:
        content = f.read()
    email = '$_git_email'
    lines = content.split('\n')
    current_role = ''
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('role:'):
            current_role = stripped.split(':',1)[1].strip().strip('\"').strip(\"'\")
        if email in stripped:
            if current_role:
                print(current_role)
                sys.exit(0)
    # Fallback: search for email and look nearby for role
    for i, line in enumerate(lines):
        if email in line:
            # Search up to 5 lines before/after for role
            for j in range(max(0,i-5), min(len(lines),i+5)):
                if 'role:' in lines[j]:
                    print(lines[j].split(':',1)[1].strip().strip('\"').strip(\"'\"))
                    sys.exit(0)
except:
    pass
" 2>/dev/null)
    fi
fi
USER_ROLE="${USER_ROLE:-dev}"

# Get user timezone from team.yaml or project.yaml
USER_TZ=""
if [ -f "$TEAM_CONFIG" ]; then
    USER_TZ=$(grep -E '^\s*timezone:' "$TEAM_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'")
fi
if [ -z "$USER_TZ" ] && [ -f "$PROJECT_CONFIG" ]; then
    USER_TZ=$(grep -E '^\s*timezone:' "$PROJECT_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//' | tr -d '"' | tr -d "'")
fi
USER_TZ="${USER_TZ:-UTC}"

# Extract all data from JSON in single jq call
eval "$(echo "$input" | jq -r '
  "current_dir=" + (.workspace.current_dir // .cwd // "." | @sh) + "\n" +
  "session_id=" + (.session_id // "" | @sh) + "\n" +
  "model_name=" + (.model.display_name // "unknown" | @sh) + "\n" +
  "cc_version_json=" + (.version // "" | @sh) + "\n" +
  "duration_ms=" + (.cost.total_duration_ms // 0 | tostring) + "\n" +
  "context_max=" + (.context_window.context_window_size // 200000 | tostring) + "\n" +
  "context_pct=" + (.context_window.used_percentage // 0 | tostring) + "\n" +
  "context_remaining=" + (.context_window.remaining_percentage // 100 | tostring) + "\n" +
  "total_input=" + (.context_window.total_input_tokens // 0 | tostring) + "\n" +
  "total_output=" + (.context_window.total_output_tokens // 0 | tostring) + "\n" +
  "worktree_branch=" + (.worktree.branch // "" | @sh) + "\n" +
  "worktree_name=" + (.worktree.name // "" | @sh)
' 2>/dev/null)"

# Override REPO_ROOT with current_dir from Claude Code (more reliable than git rev-parse)
if [ -n "${current_dir:-}" ] && [ -d "${current_dir}/.tai" ]; then
    REPO_ROOT="$current_dir"
    TAI_DIR="$REPO_ROOT/.tai"
    TEAM_CONFIG="$TAI_DIR/config/team.yaml"
    PROJECT_CONFIG="$TAI_DIR/config/project.yaml"
    VERSION_FILE="$TAI_DIR/VERSION"
    HOOKS_CONFIG="$TAI_DIR/hooks/config.yaml"
    SPRINT_FILE="$TAI_DIR/context/sprint-current.md"
    RATINGS_FILE="$TAI_DIR/memory/signals/ratings.jsonl"

    # Re-read config values with corrected paths
    if [ -f "$TEAM_CONFIG" ]; then
        TEAM_NAME=$(grep -E '^\s+name:' "$TEAM_CONFIG" 2>/dev/null | head -1 | sed 's/.*name: *//; s/ *#.*//' | tr -d '"'"'")
        TEAM_NAME="${TEAM_NAME:-Team}"

        _git_email=$(git config user.email 2>/dev/null)
        if [ -n "$_git_email" ]; then
            _role=$(awk -v email="$_git_email" '
                /^\s+- name:/ { found=0 }
                /email:/ && $0 ~ email { found=1 }
                found && /default_role:/ { gsub(/.*default_role: */, ""); gsub(/ *#.*/, ""); gsub(/["'"'"']/, ""); print; exit }
            ' "$TEAM_CONFIG" 2>/dev/null)
            [ -n "$_role" ] && USER_ROLE="$_role"
        fi
    fi
    TAI_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || echo "?.?.?")
fi

# Ensure defaults for critical numeric values
context_pct=${context_pct:-0}
context_max=${context_max:-200000}
context_remaining=${context_remaining:-100}
total_input=${total_input:-0}
total_output=${total_output:-0}

# ─────────────────────────────────────────────────────────────────────────────
# SESSION COST ESTIMATION (real-time from token counts)
# Pricing: platform.claude.com/docs/en/about-claude/pricing
# ─────────────────────────────────────────────────────────────────────────────
session_cost_str=""
if [ "$total_input" -gt 0 ] || [ "$total_output" -gt 0 ]; then
    case "$model_name" in
        *"Opus 4"*|*"opus-4"*)   input_mtok="15.00"; output_mtok="75.00" ;;
        *"Sonnet 4"*)             input_mtok="3.00";  output_mtok="15.00" ;;
        *"Haiku 4"*|*"haiku-4"*) input_mtok="0.80";  output_mtok="4.00"  ;;
        *)                        input_mtok="3.00";  output_mtok="15.00" ;;
    esac
    session_cost_str=$(python3 -c "
cost = ($total_input * $input_mtok + $total_output * $output_mtok) / 1_000_000
if cost < 0.01:
    print(f'\${cost:.4f}')
elif cost < 1.00:
    print(f'\${cost:.3f}')
else:
    print(f'\${cost:.2f}')
" 2>/dev/null)
fi

# Get Claude Code version
if [ -n "$cc_version_json" ] && [ "$cc_version_json" != "unknown" ]; then
    cc_version="$cc_version_json"
else
    cc_version=$(claude --version 2>/dev/null | head -1 | awk '{print $1}')
    cc_version="${cc_version:-unknown}"
fi

# Cache model name for other tools
mkdir -p "$(dirname "$MODEL_CACHE")" 2>/dev/null
echo "$model_name" > "$MODEL_CACHE" 2>/dev/null

dir_name=$(basename "$current_dir" 2>/dev/null || echo ".")

# Get session label from Claude Code's sessions-index.json
SESSION_LABEL=""
if [ -n "$session_id" ]; then
    project_slug=$(echo "$current_dir" | tr '/.' '-')
    CLAUDE_DIR_LOCAL="$HOME/.claude"
    SESSIONS_INDEX="$CLAUDE_DIR_LOCAL/projects/${project_slug}/sessions-index.json"

    # Fast path: check shell cache
    if [ -f "$SESSION_CACHE" ]; then
        source "$SESSION_CACHE" 2>/dev/null
        if [ "${cached_session_id:-}" = "$session_id" ] && [ -n "${cached_session_label:-}" ]; then
            cache_mtime=$(get_mtime "$SESSION_CACHE")
            idx_mtime=$(get_mtime "$SESSIONS_INDEX")
            names_mtime=$(get_mtime "$SESSION_NAMES_FILE")
            max_source_mtime=$idx_mtime
            [ "$names_mtime" -gt "$max_source_mtime" ] && max_source_mtime=$names_mtime
            [ "$cache_mtime" -ge "$max_source_mtime" ] && SESSION_LABEL="${cached_session_label}"
        fi
    fi

    # Cache miss: look up customTitle from sessions-index
    if [ -z "$SESSION_LABEL" ] && [ -f "$SESSIONS_INDEX" ]; then
        custom_title_line=$(grep -A10 "\"sessionId\": \"$session_id\"" "$SESSIONS_INDEX" 2>/dev/null | grep '"customTitle"' | head -1)
        if [ -n "$custom_title_line" ]; then
            SESSION_LABEL=$(echo "$custom_title_line" | sed 's/.*"customTitle": "//; s/".*//')
        fi
    fi

    # Fallback: session-names.json
    if [ -z "$SESSION_LABEL" ] && [ -f "$SESSION_NAMES_FILE" ]; then
        SESSION_LABEL=$(jq -r --arg sid "$session_id" '.[$sid] // empty' "$SESSION_NAMES_FILE" 2>/dev/null)
    fi

    # Update cache
    if [ -n "$SESSION_LABEL" ]; then
        mkdir -p "$(dirname "$SESSION_CACHE")" 2>/dev/null
        printf "cached_session_id='%s'\ncached_session_label='%s'\n" "$session_id" "$SESSION_LABEL" > "$SESSION_CACHE"
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# SPRINT INFO — auto-detect from project sources
# Priority: 1) sprint-current.md  2) CLAUDE.md  3) CHANGELOG.md
# ─────────────────────────────────────────────────────────────────────────────
SPRINT_NAME=""
SPRINT_ISC_PROGRESS=""

# Source 1: TAI sprint-current.md (if populated, not template)
if [ -f "$SPRINT_FILE" ] && ! grep -q "Sprint 0: TAI Setup" "$SPRINT_FILE" 2>/dev/null; then
    SPRINT_NAME=$(grep -iE '^#.*sprint|^sprint' "$SPRINT_FILE" 2>/dev/null | head -1 | sed 's/^#* *//')
    # Count ISC checkboxes
    total=$(grep -cE '^\s*- \[[ x]\]' "$SPRINT_FILE" 2>/dev/null || echo 0)
    done=$(grep -cE '^\s*- \[x\]' "$SPRINT_FILE" 2>/dev/null || echo 0)
    [ "$total" -gt 0 ] && SPRINT_ISC_PROGRESS="${done}/${total} ISC"
fi

# Source 2: Project CLAUDE.md (look for "Next: Sprint N" or "Sprint N is next")
# Use current_dir from Claude Code input (not REPO_ROOT which may be submodule)
PROJECT_DIR="${current_dir:-$REPO_ROOT}"
if [ -z "$SPRINT_NAME" ] && [ -f "$PROJECT_DIR/CLAUDE.md" ]; then
    # Match patterns like "Next: Sprint 32" or "Sprint 32 is next" or "next sprint: Sprint 32"
    SPRINT_NAME=$(grep -ioE '(next[: ]+sprint [0-9]+[^.]*|sprint [0-9]+[^.]*is next)' "$PROJECT_DIR/CLAUDE.md" 2>/dev/null | head -1 | sed 's/[Nn]ext[: ]*//')
    # Also try "Sprint progress:... Next: Sprint N"
    if [ -z "$SPRINT_NAME" ]; then
        SPRINT_NAME=$(grep -ioE 'Next: Sprint [0-9]+' "$PROJECT_DIR/CLAUDE.md" 2>/dev/null | head -1 | sed 's/Next: //')
    fi
fi

# Source 3: CHANGELOG.md (latest version = current sprint)
if [ -z "$SPRINT_NAME" ] && [ -f "$PROJECT_DIR/CHANGELOG.md" ]; then
    # Get the first sprint reference from changelog
    SPRINT_NAME=$(grep -ioE 'Sprint [0-9]+' "$PROJECT_DIR/CHANGELOG.md" 2>/dev/null | head -1)
fi

# ─────────────────────────────────────────────────────────────────────────────
# MEMORY COUNTS — decisions, learnings, signals
# ─────────────────────────────────────────────────────────────────────────────
decisions_count=0
learnings_count=0
signals_count=0

# Count decisions (*.md in memory/decisions/ excluding INDEX.md and TEMPLATE.md)
if [ -d "$TAI_DIR/memory/decisions" ]; then
    decisions_count=$(find "$TAI_DIR/memory/decisions" -maxdepth 1 -name '*.md' ! -name 'INDEX.md' ! -name 'TEMPLATE.md' 2>/dev/null | wc -l | tr -d ' ')
fi

# Count learnings (files in memory/learnings/)
if [ -d "$TAI_DIR/memory/learnings" ]; then
    learnings_count=$(find "$TAI_DIR/memory/learnings" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
fi

# Count signals/ratings
if [ -f "$RATINGS_FILE" ]; then
    signals_count=$(wc -l < "$RATINGS_FILE" 2>/dev/null | tr -d ' ')
fi

# ─────────────────────────────────────────────────────────────────────────────
# PARALLEL PREFETCH - Launch ALL expensive operations immediately
# ─────────────────────────────────────────────────────────────────────────────

_parallel_tmp="/tmp/tai-parallel-$$"
mkdir -p "$_parallel_tmp"

# --- PARALLEL BLOCK START ---
{
    # 1. Git — FAST INDEX-ONLY ops (<50ms total, no working tree scan)
    if git rev-parse --git-dir > /dev/null 2>&1; then
        branch=$(git branch --show-current 2>/dev/null)
        [ -z "$branch" ] && branch="detached"
        if [ -n "$worktree_branch" ]; then
            branch="$worktree_branch"
        fi
        stash_count=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
        [ -z "$stash_count" ] && stash_count=0
        sync_info=$(git rev-list --left-right --count HEAD...@{u} 2>/dev/null)
        last_commit_epoch=$(git log -1 --format='%ct' 2>/dev/null)

        if [ -n "$sync_info" ]; then
            ahead=$(echo "$sync_info" | awk '{print $1}')
            behind=$(echo "$sync_info" | awk '{print $2}')
        else
            ahead=0
            behind=0
        fi
        [ -z "$ahead" ] && ahead=0
        [ -z "$behind" ] && behind=0

        cat > "$_parallel_tmp/git.sh" << GITEOF
branch='$branch'
stash_count=${stash_count:-0}
ahead=${ahead:-0}
behind=${behind:-0}
last_commit_epoch=${last_commit_epoch:-0}
is_git_repo=true
GITEOF
    else
        echo "is_git_repo=false" > "$_parallel_tmp/git.sh"
    fi
} &

{
    # 2. Location fetch (per-member config → team config → cache → API)
    # Match current user's git email to their member entry in team.yaml
    config_city=""
    config_state=""
    if [ -f "$TEAM_CONFIG" ]; then
        git_email=$(git config user.email 2>/dev/null)
        if [ -n "$git_email" ]; then
            # Find the member block matching this email, extract their location
            config_city=$(awk -v email="$git_email" '
                /^\s+- name:/ { in_member=1; found=0; city=""; state="" }
                in_member && /email:/ && $0 ~ email { found=1 }
                found && /city:/ { gsub(/.*city: */, ""); gsub(/ *#.*/, ""); gsub(/["\047]/, ""); city=$0 }
                found && /state:/ { gsub(/.*state: */, ""); gsub(/ *#.*/, ""); gsub(/["\047]/, ""); state=$0 }
                found && city != "" { print city; exit }
            ' "$TEAM_CONFIG" 2>/dev/null)
            config_state=$(awk -v email="$git_email" '
                /^\s+- name:/ { in_member=1; found=0; state="" }
                in_member && /email:/ && $0 ~ email { found=1 }
                found && /state:/ { gsub(/.*state: */, ""); gsub(/ *#.*/, ""); gsub(/["\047]/, ""); print; exit }
            ' "$TEAM_CONFIG" 2>/dev/null)
        fi
        # Fallback: team-level location (if no per-member location)
        if [ -z "$config_city" ]; then
            config_city=$(awk '
                /^  location:/ { in_loc=1; next }
                in_loc && /city:/ { gsub(/.*city: */, ""); gsub(/ *#.*/, ""); gsub(/["\047]/, ""); if ($0 != "") print; exit }
                in_loc && /^  [a-z]/ && !/state:/ { exit }
            ' "$TEAM_CONFIG" 2>/dev/null)
            config_state=$(awk '
                /^  location:/ { in_loc=1; next }
                in_loc && /state:/ { gsub(/.*state: */, ""); gsub(/ *#.*/, ""); gsub(/["\047]/, ""); if ($0 != "") print; exit }
                in_loc && /^  [a-z]/ && !/city:/ { exit }
            ' "$TEAM_CONFIG" 2>/dev/null)
        fi
    fi
    if [ -n "$config_city" ]; then
        echo -e "location_city='${config_city}'\nlocation_state='${config_state}'" > "$_parallel_tmp/location.sh"
    else
    cache_age=999999
    [ -f "$LOCATION_CACHE" ] && cache_age=$(($(date +%s) - $(get_mtime "$LOCATION_CACHE")))

    if [ "$cache_age" -gt "$LOCATION_CACHE_TTL" ]; then
        loc_data=$(curl -s --max-time 2 "http://ip-api.com/json/?fields=city,regionName,country,lat,lon" 2>/dev/null)
        if [ -n "$loc_data" ] && echo "$loc_data" | jq -e '.city' >/dev/null 2>&1; then
            mkdir -p "$(dirname "$LOCATION_CACHE")" 2>/dev/null
            echo "$loc_data" > "$LOCATION_CACHE"
        fi
    fi

    if [ -f "$LOCATION_CACHE" ]; then
        jq -r '"location_city=" + (.city | @sh) + "\nlocation_state=" + (.regionName | @sh)' "$LOCATION_CACHE" > "$_parallel_tmp/location.sh" 2>/dev/null
    else
        echo -e "location_city='Unknown'\nlocation_state=''" > "$_parallel_tmp/location.sh"
    fi
    fi
} &

{
    # 3. Weather fetch (with caching)
    cache_age=999999
    [ -f "$WEATHER_CACHE" ] && cache_age=$(($(date +%s) - $(get_mtime "$WEATHER_CACHE")))

    if [ "$cache_age" -gt "$WEATHER_CACHE_TTL" ]; then
        lat="" lon=""
        if [ -f "$LOCATION_CACHE" ]; then
            lat=$(jq -r '.lat // empty' "$LOCATION_CACHE" 2>/dev/null)
            lon=$(jq -r '.lon // empty' "$LOCATION_CACHE" 2>/dev/null)
        fi
        lat="${lat:-37.7749}"
        lon="${lon:-122.4194}"

        weather_json=$(curl -s --max-time 3 "https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${TEMP_UNIT}" 2>/dev/null)
        if [ -n "$weather_json" ] && echo "$weather_json" | jq -e '.current' >/dev/null 2>&1; then
            temp=$(echo "$weather_json" | jq -r '.current.temperature_2m' 2>/dev/null)
            code=$(echo "$weather_json" | jq -r '.current.weather_code' 2>/dev/null)
            condition="Clear"
            case "$code" in
                0) condition="Clear" ;; 1|2|3) condition="Cloudy" ;; 45|48) condition="Foggy" ;;
                51|53|55|56|57) condition="Drizzle" ;; 61|63|65|66|67) condition="Rain" ;;
                71|73|75|77) condition="Snow" ;; 80|81|82) condition="Showers" ;;
                85|86) condition="Snow" ;; 95|96|99) condition="Storm" ;;
            esac
            mkdir -p "$(dirname "$WEATHER_CACHE")" 2>/dev/null
            if [ "$TEMP_UNIT" = "celsius" ]; then
                echo "${temp}C ${condition}" > "$WEATHER_CACHE"
            else
                echo "${temp}F ${condition}" > "$WEATHER_CACHE"
            fi
        fi
    fi

    if [ -f "$WEATHER_CACHE" ]; then
        echo "weather_str='$(cat "$WEATHER_CACHE" 2>/dev/null)'" > "$_parallel_tmp/weather.sh"
    else
        echo "weather_str=''" > "$_parallel_tmp/weather.sh"
    fi
} &

{
    # 4. Quote prefetch
    quote_age=$(($(date +%s) - $(get_mtime "$QUOTE_CACHE")))
    if [ "$quote_age" -gt 300 ] || [ ! -f "$QUOTE_CACHE" ]; then
        if [ -n "${ZENQUOTES_API_KEY:-}" ]; then
            new_quote=$(curl -s --max-time 1 "https://zenquotes.io/api/random/${ZENQUOTES_API_KEY}" 2>/dev/null | \
                jq -r '.[0] | select(.q | length < 80) | .q + "|" + .a' 2>/dev/null)
            [ -n "$new_quote" ] && [ "$new_quote" != "null" ] && echo "$new_quote" > "$QUOTE_CACHE"
        fi
    fi
} &

# --- PARALLEL BLOCK END ---
wait

# Source all parallel results
[ -f "$_parallel_tmp/git.sh" ] && source "$_parallel_tmp/git.sh"
[ -f "$_parallel_tmp/location.sh" ] && source "$_parallel_tmp/location.sh"
[ -f "$_parallel_tmp/weather.sh" ] && source "$_parallel_tmp/weather.sh"
rm -rf "$_parallel_tmp" 2>/dev/null

# ─────────────────────────────────────────────────────────────────────────────
# TERMINAL WIDTH DETECTION
# ─────────────────────────────────────────────────────────────────────────────

_width_cache="/tmp/tai-term-width-${KITTY_WINDOW_ID:-default}"

detect_terminal_width() {
    local width=""

    # Tier 1: Kitty IPC
    if [ -n "$KITTY_WINDOW_ID" ] && command -v kitten >/dev/null 2>&1; then
        width=$(kitten @ ls 2>/dev/null | jq -r --argjson wid "$KITTY_WINDOW_ID" \
            '.[].tabs[].windows[] | select(.id == $wid) | .columns' 2>/dev/null)
    fi

    # Tier 2: Direct TTY query
    [ -z "$width" ] || [ "$width" = "0" ] || [ "$width" = "null" ] && \
        width=$(stty size </dev/tty 2>/dev/null | awk '{print $2}')

    # Tier 3: tput fallback
    [ -z "$width" ] || [ "$width" = "0" ] && width=$(tput cols 2>/dev/null)

    # Cache if valid
    if [ -n "$width" ] && [ "$width" != "0" ] && [ "$width" -gt 0 ] 2>/dev/null; then
        echo "$width" > "$_width_cache" 2>/dev/null
        echo "$width"
        return
    fi

    # Tier 4: Cached width
    if [ -f "$_width_cache" ]; then
        local cached
        cached=$(cat "$_width_cache" 2>/dev/null)
        if [ "$cached" -gt 0 ] 2>/dev/null; then
            echo "$cached"
            return
        fi
    fi

    # Tier 5: Environment / default
    echo "${COLUMNS:-80}"
}

term_width=$(detect_terminal_width)

if [ "$term_width" -lt 35 ]; then
    MODE="nano"
elif [ "$term_width" -lt 55 ]; then
    MODE="micro"
elif [ "$term_width" -lt 80 ]; then
    MODE="mini"
else
    MODE="normal"
fi

dir_name=$(basename "$current_dir")

# ─────────────────────────────────────────────────────────────────────────────
# COLOR PALETTE (Tailwind-inspired)
# ─────────────────────────────────────────────────────────────────────────────

RESET='\033[0m'

# Structural
SLATE_300='\033[38;2;203;213;225m'
SLATE_400='\033[38;2;148;163;184m'
SLATE_500='\033[38;2;100;116;139m'
SLATE_600='\033[38;2;71;85;105m'

# Semantic
EMERALD='\033[38;2;74;222;128m'
ROSE='\033[38;2;251;113;133m'

# Rating gradient
RATING_10='\033[38;2;74;222;128m'
RATING_8='\033[38;2;163;230;53m'
RATING_7='\033[38;2;250;204;21m'
RATING_6='\033[38;2;251;191;36m'
RATING_5='\033[38;2;251;146;60m'
RATING_4='\033[38;2;248;113;113m'
RATING_LOW='\033[38;2;239;68;68m'

# TAI Branding (teal/cyan theme — distinguishes from PAI's violet/navy)
TAI_T='\033[38;2;20;184;166m'         # Teal
TAI_A='\033[38;2;34;211;238m'         # Cyan
TAI_I='\033[38;2;103;232;249m'        # Light cyan
TAI_LABEL='\033[38;2;100;116;139m'    # Slate for labels
TAI_CITY='\033[38;2;147;197;253m'     # Light blue for city
TAI_STATE='\033[38;2;100;116;139m'    # Slate for state
TAI_TIME='\033[38;2;96;165;250m'      # Medium-light blue for time
TAI_WEATHER='\033[38;2;135;206;235m'  # Sky blue for weather
TAI_SESSION='\033[38;2;120;135;160m'  # Muted blue-gray for session label

# Git (sky/blue theme)
GIT_PRIMARY='\033[38;2;56;189;248m'
GIT_VALUE='\033[38;2;186;230;253m'
GIT_DIR='\033[38;2;147;197;253m'
GIT_CLEAN='\033[38;2;125;211;252m'
GIT_STASH='\033[38;2;165;180;252m'
GIT_AGE_FRESH='\033[38;2;125;211;252m'
GIT_AGE_RECENT='\033[38;2;96;165;250m'
GIT_AGE_STALE='\033[38;2;59;130;246m'
GIT_AGE_OLD='\033[38;2;99;102;241m'

# Memory (purple theme)
LEARN_PRIMARY='\033[38;2;167;139;250m'
LEARN_SECONDARY='\033[38;2;196;181;253m'
LEARN_WORK='\033[38;2;192;132;252m'
LEARN_SIGNALS='\033[38;2;139;92;246m'
LEARN_RESEARCH='\033[38;2;129;140;248m'
LEARN_SESSIONS='\033[38;2;99;102;241m'

# Learning sparklines
SIGNAL_PERIOD='\033[38;2;148;163;184m'
LEARN_LABEL='\033[38;2;21;128;61m'

# Context (indigo theme)
CTX_PRIMARY='\033[38;2;129;140;248m'
CTX_SECONDARY='\033[38;2;165;180;252m'
CTX_BUCKET_EMPTY='\033[38;2;75;82;95m'

# Sprint (teal theme)
SPRINT_PRIMARY='\033[38;2;20;184;166m'
SPRINT_VALUE='\033[38;2;94;234;212m'
SPRINT_ISC_CLR='\033[38;2;45;212;191m'

# Quote (gold theme)
QUOTE_PRIMARY='\033[38;2;252;211;77m'
QUOTE_AUTHOR='\033[38;2;180;140;60m'

# Wielding/env
WIELD_ACCENT='\033[38;2;103;232;249m'
WIELD_HOOKS='\033[38;2;6;182;212m'

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

get_rating_color() {
    local val="$1"
    [[ "$val" == "—" || -z "$val" ]] && { echo "$SLATE_400"; return; }
    local rating_int=${val%%.*}
    [[ ! "$rating_int" =~ ^[0-9]+$ ]] && { echo "$SLATE_400"; return; }

    if   [ "$rating_int" -ge 9 ]; then echo "$RATING_10"
    elif [ "$rating_int" -ge 8 ]; then echo "$RATING_8"
    elif [ "$rating_int" -ge 7 ]; then echo "$RATING_7"
    elif [ "$rating_int" -ge 6 ]; then echo "$RATING_6"
    elif [ "$rating_int" -ge 5 ]; then echo "$RATING_5"
    elif [ "$rating_int" -ge 4 ]; then echo "$RATING_4"
    else echo "$RATING_LOW"
    fi
}

get_bucket_color() {
    local pos=$1 max=$2
    local pct=$((pos * 100 / max))
    local r g b

    if [ "$pct" -le 33 ]; then
        r=$((74 + (250 - 74) * pct / 33))
        g=$((222 + (204 - 222) * pct / 33))
        b=$((128 + (21 - 128) * pct / 33))
    elif [ "$pct" -le 66 ]; then
        local t=$((pct - 33))
        r=$((250 + (251 - 250) * t / 33))
        g=$((204 + (146 - 204) * t / 33))
        b=$((21 + (60 - 21) * t / 33))
    else
        local t=$((pct - 66))
        r=$((251 + (239 - 251) * t / 34))
        g=$((146 + (68 - 146) * t / 34))
        b=$((60 + (68 - 60) * t / 34))
    fi
    printf '\033[38;2;%d;%d;%dm' "$r" "$g" "$b"
}

render_context_bar() {
    local width=$1 pct=$2
    local output="" last_color=""

    local filled=$((pct * width / 100))
    [ "$filled" -lt 0 ] && filled=0

    local use_spacing=false
    [ "$width" -le 20 ] && use_spacing=true

    for i in $(seq 1 $width 2>/dev/null); do
        if [ "$i" -le "$filled" ]; then
            local color=$(get_bucket_color $i $width)
            last_color="$color"
            output="${output}${color}⛁${RESET}"
            [ "$use_spacing" = true ] && output="${output} "
        else
            output="${output}${CTX_BUCKET_EMPTY}⛁${RESET}"
            [ "$use_spacing" = true ] && output="${output} "
        fi
    done

    output="${output% }"
    echo "$output"
    LAST_BUCKET_COLOR="${last_color:-$EMERALD}"
}

calc_bar_width() {
    local mode=$1
    local content_width=72
    local prefix_len suffix_len bucket_size available

    case "$mode" in
        nano)   prefix_len=2;  suffix_len=5; bucket_size=2 ;;
        micro)  prefix_len=2;  suffix_len=5; bucket_size=2 ;;
        mini)   prefix_len=12; suffix_len=5; bucket_size=2 ;;
        normal) prefix_len=12; suffix_len=5; bucket_size=1 ;;
    esac

    available=$((content_width - prefix_len - suffix_len))
    local buckets=$((available / bucket_size))

    [ "$mode" = "nano" ] && [ "$buckets" -lt 5 ] && buckets=5
    [ "$mode" = "micro" ] && [ "$buckets" -lt 6 ] && buckets=6
    [ "$mode" = "mini" ] && [ "$buckets" -lt 8 ] && buckets=8
    [ "$mode" = "normal" ] && [ "$buckets" -lt 16 ] && buckets=16

    echo "$buckets"
}

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 0: TAI BRANDING (location, time, weather, team, role)
# ═══════════════════════════════════════════════════════════════════════════════

current_time=$(date +"%H:%M")

session_display=""
if [ -n "$SESSION_LABEL" ]; then
    session_display=$(echo "$SESSION_LABEL" | tr '[:lower:]' '[:upper:]')
fi

case "$MODE" in
    nano)
        printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| ----------------${RESET}\n"
        printf "${TAI_TIME}${current_time}${RESET}"
        [ -n "$weather_str" ] && printf " ${TAI_WEATHER}${weather_str}${RESET}"
        printf "\n"
        printf "${SLATE_400}v${RESET}${TAI_A}${TAI_VERSION}${RESET} ${SLATE_400}H:${SLATE_300}${HOOK_COUNT}${RESET}\n"
        ;;
    micro)
        if [ -n "$session_display" ]; then
            local_left="-- | TAI |"
            local_right="${session_display}"
            local_left_len=${#local_left}
            local_right_len=${#session_display}
            local_fill=$((72 - local_left_len - local_right_len))
            [ "$local_fill" -lt 2 ] && local_fill=2
            local_dashes=$(printf '%*s' "$local_fill" '' | sed 's/ /-/g')
            printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| ${local_dashes}${RESET} ${TAI_SESSION}${session_display}${RESET}\n"
        else
            printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| ------------------${RESET}\n"
        fi
        printf "${TAI_LABEL}LOC:${RESET} ${TAI_CITY}${location_city}${RESET} ${SLATE_600}|${RESET} ${TAI_TIME}${current_time}${RESET}"
        [ -n "$weather_str" ] && printf " ${SLATE_600}|${RESET} ${TAI_WEATHER}${weather_str}${RESET}"
        printf "\n"
        printf "${SLATE_400}ENV:${RESET} ${SLATE_400}CC:${RESET} ${TAI_A}${cc_version}${RESET} ${SLATE_600}|${RESET} ${SLATE_500}TAI:${TAI_A}${TAI_VERSION}${RESET} ${SLATE_600}|${RESET} ${WIELD_HOOKS}H:${SLATE_300}${HOOK_COUNT}${RESET} ${SLATE_600}|${RESET} ${SLATE_400}R:${SLATE_300}${USER_ROLE}${RESET}\n"
        ;;
    mini)
        if [ -n "$session_display" ]; then
            local_left="-- | TAI |"
            local_right="${session_display}"
            local_left_len=${#local_left}
            local_right_len=${#session_display}
            local_fill=$((72 - local_left_len - local_right_len))
            [ "$local_fill" -lt 2 ] && local_fill=2
            local_dashes=$(printf '%*s' "$local_fill" '' | sed 's/ /-/g')
            printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| ${local_dashes}${RESET} ${TAI_SESSION}${session_display}${RESET}\n"
        else
            printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| ----------------------------------------${RESET}\n"
        fi
        printf "${TAI_LABEL}LOC:${RESET} ${TAI_CITY}${location_city}${RESET}${SLATE_600},${RESET} ${TAI_STATE}${location_state}${RESET} ${SLATE_600}|${RESET} ${TAI_TIME}${current_time}${RESET}"
        [ -n "$weather_str" ] && printf " ${SLATE_600}|${RESET} ${TAI_WEATHER}${weather_str}${RESET}"
        printf "\n"
        printf "${SLATE_400}ENV:${RESET} ${SLATE_400}CC:${RESET} ${TAI_A}${cc_version}${RESET} ${SLATE_600}|${RESET} ${SLATE_500}TAI:${TAI_A}${TAI_VERSION}${RESET} ${SLATE_600}|${RESET} ${WIELD_HOOKS}Hooks:${RESET}${SLATE_300}${HOOK_COUNT}${RESET} ${SLATE_600}|${RESET} ${WIELD_ACCENT}Role:${RESET}${SLATE_300}${USER_ROLE}${RESET}"
        [ -n "$TEAM_NAME" ] && printf " ${SLATE_600}|${RESET} ${TAI_T}Team:${RESET}${SLATE_300}${TEAM_NAME}${RESET}"
        printf "\n"
        ;;
    normal)
        if [ -n "$session_display" ]; then
            local_left="-- | TAI |"
            local_right="${session_display}"
            local_left_len=${#local_left}
            local_right_len=${#session_display}
            local_fill=$((72 - local_left_len - local_right_len))
            [ "$local_fill" -lt 2 ] && local_fill=2
            local_dashes=$(printf '%*s' "$local_fill" '' | sed 's/ /-/g')
            printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| ${local_dashes}${RESET} ${TAI_SESSION}${session_display}${RESET}\n"
        else
            printf "${SLATE_600}-- |${RESET} ${TAI_T}T${TAI_A}A${TAI_I}I${RESET} ${SLATE_600}| --------------------------------------------------${RESET}\n"
        fi
        printf "${TAI_LABEL}LOC:${RESET} ${TAI_CITY}${location_city}${RESET}${SLATE_600},${RESET} ${TAI_STATE}${location_state}${RESET} ${SLATE_600}|${RESET} ${TAI_TIME}${current_time}${RESET}"
        [ -n "$weather_str" ] && printf " ${SLATE_600}|${RESET} ${TAI_WEATHER}${weather_str}${RESET}"
        printf "\n"
        printf "${SLATE_400}ENV:${RESET} ${SLATE_400}CC:${RESET} ${TAI_A}${cc_version}${RESET} ${SLATE_600}|${RESET} ${SLATE_500}TAI:${TAI_A}${TAI_VERSION}${RESET} ${SLATE_600}|${RESET} ${WIELD_HOOKS}Hooks:${RESET} ${SLATE_300}${HOOK_COUNT}${RESET} ${SLATE_600}|${RESET} ${WIELD_ACCENT}Role:${RESET} ${SLATE_300}${USER_ROLE}${RESET}"
        [ -n "$TEAM_NAME" ] && printf " ${SLATE_600}|${RESET} ${TAI_T}Team:${RESET} ${SLATE_300}${TEAM_NAME}${RESET}"
        printf "\n"
        ;;
esac
printf "${SLATE_600}------------------------------------------------------------------------${RESET}\n"

# ═══════════════════════════════════════════════════════════════════════════════
# LINE 1: CONTEXT
# ═══════════════════════════════════════════════════════════════════════════════

# Format duration
duration_sec=$((duration_ms / 1000))
if   [ "$duration_sec" -ge 3600 ]; then time_display="$((duration_sec / 3600))h$((duration_sec % 3600 / 60))m"
elif [ "$duration_sec" -ge 60 ];   then time_display="$((duration_sec / 60))m$((duration_sec % 60))s"
else time_display="${duration_sec}s"
fi

# Context display — scale to compaction threshold if configured in project.yaml
context_max="${context_max:-200000}"
max_k=$((context_max / 1000))

COMPACTION_THRESHOLD=100
if [ -f "$PROJECT_CONFIG" ]; then
    _ct=$(grep -E '^\s*compactionThreshold:' "$PROJECT_CONFIG" 2>/dev/null | head -1 | sed 's/.*: *//')
    [ -n "$_ct" ] && COMPACTION_THRESHOLD="$_ct"
fi

raw_pct="${context_pct%%.*}"
[ -z "$raw_pct" ] && raw_pct=0

if [ "$COMPACTION_THRESHOLD" -lt 100 ] && [ "$COMPACTION_THRESHOLD" -gt 0 ]; then
    display_pct=$((raw_pct * 100 / COMPACTION_THRESHOLD))
    [ "$display_pct" -gt 100 ] && display_pct=100
else
    display_pct="$raw_pct"
fi

if [ "$display_pct" -ge 80 ]; then
    pct_color="$ROSE"
elif [ "$display_pct" -ge 60 ]; then
    pct_color='\033[38;2;251;146;60m'
elif [ "$display_pct" -ge 40 ]; then
    pct_color='\033[38;2;251;191;36m'
else
    pct_color="$EMERALD"
fi

bar_width=$(calc_bar_width "$MODE")

case "$MODE" in
    nano)
        bar=$(render_context_bar $bar_width $display_pct)
        printf "${CTX_PRIMARY}@${RESET} ${bar} ${pct_color}${raw_pct}%%${RESET}\n"
        ;;
    micro)
        bar=$(render_context_bar $bar_width $display_pct)
        printf "${CTX_PRIMARY}@${RESET} ${bar} ${pct_color}${raw_pct}%%${RESET}\n"
        ;;
    mini)
        bar=$(render_context_bar $bar_width $display_pct)
        printf "${CTX_PRIMARY}@${RESET} ${CTX_SECONDARY}CONTEXT:${RESET} ${bar} ${pct_color}${raw_pct}%%${RESET}\n"
        ;;
    normal)
        bar=$(render_context_bar $bar_width $display_pct)
        printf "${CTX_PRIMARY}@${RESET} ${CTX_SECONDARY}CONTEXT:${RESET} ${bar} ${pct_color}${raw_pct}%%${RESET}"
        [ -n "$session_cost_str" ] && printf " ${SLATE_600}|${RESET} ${SLATE_400}Cost:${RESET} ${SLATE_300}${session_cost_str}${RESET}"
        printf "\n"
        ;;
esac
printf "${SLATE_600}------------------------------------------------------------------------${RESET}\n"

# ═══════════════════════════════════════════════════════════════════════════════
# LINE: PWD & GIT (index-only: branch, age, stash, sync)
# ═══════════════════════════════════════════════════════════════════════════════

# Calculate age display from prefetched last_commit_epoch
if [ "$is_git_repo" = "true" ] && [ -n "$last_commit_epoch" ]; then
    now_epoch=$(date +%s)
    age_seconds=$((now_epoch - last_commit_epoch))
    age_minutes=$((age_seconds / 60))
    age_hours=$((age_seconds / 3600))
    age_days=$((age_seconds / 86400))

    if   [ "$age_minutes" -lt 1 ];  then age_display="now";            age_color="$GIT_AGE_FRESH"
    elif [ "$age_hours" -lt 1 ];    then age_display="${age_minutes}m"; age_color="$GIT_AGE_FRESH"
    elif [ "$age_hours" -lt 24 ];   then age_display="${age_hours}h";   age_color="$GIT_AGE_RECENT"
    elif [ "$age_days" -lt 7 ];     then age_display="${age_days}d";    age_color="$GIT_AGE_STALE"
    else age_display="${age_days}d"; age_color="$GIT_AGE_OLD"
    fi
fi

case "$MODE" in
    nano)
        printf "${GIT_PRIMARY}<>${RESET} ${GIT_DIR}${dir_name}${RESET}"
        [ "$is_git_repo" = true ] && printf " ${GIT_VALUE}${branch}${RESET}"
        printf "\n"
        ;;
    micro)
        printf "${GIT_PRIMARY}<>${RESET} ${GIT_DIR}${dir_name}${RESET}"
        if [ "$is_git_repo" = true ]; then
            printf " ${GIT_VALUE}${branch}${RESET}"
            [ -n "$age_display" ] && printf " ${age_color}${age_display}${RESET}"
        fi
        printf "\n"
        ;;
    mini)
        printf "${GIT_PRIMARY}<>${RESET} ${GIT_DIR}${dir_name}${RESET}"
        if [ "$is_git_repo" = true ]; then
            printf " ${SLATE_600}|${RESET} ${GIT_VALUE}${branch}${RESET}"
            [ -n "$age_display" ] && printf " ${SLATE_600}|${RESET} ${age_color}${age_display}${RESET}"
        fi
        printf "\n"
        ;;
    normal)
        printf "${GIT_PRIMARY}<>${RESET} ${GIT_PRIMARY}PWD:${RESET} ${GIT_DIR}${dir_name}${RESET}"
        if [ "$is_git_repo" = true ]; then
            printf " ${SLATE_600}|${RESET} ${GIT_PRIMARY}Branch:${RESET} ${GIT_VALUE}${branch}${RESET}"
            [ -n "$age_display" ] && printf " ${SLATE_600}|${RESET} ${GIT_PRIMARY}Age:${RESET} ${age_color}${age_display}${RESET}"
            [ "$stash_count" -gt 0 ] && printf " ${SLATE_600}|${RESET} ${GIT_PRIMARY}Stash:${RESET} ${GIT_STASH}${stash_count}${RESET}"
            if [ "$ahead" -gt 0 ] || [ "$behind" -gt 0 ]; then
                printf " ${SLATE_600}|${RESET} ${GIT_PRIMARY}Sync:${RESET} "
                [ "$ahead" -gt 0 ] && printf "${GIT_CLEAN}+${ahead}${RESET}"
                [ "$behind" -gt 0 ] && printf "${GIT_STASH}-${behind}${RESET}"
            fi
        fi
        printf "\n"
        ;;
esac
printf "${SLATE_600}------------------------------------------------------------------------${RESET}\n"

# ═══════════════════════════════════════════════════════════════════════════════
# LINE: MEMORY (decisions, learnings, signals)
# ═══════════════════════════════════════════════════════════════════════════════

case "$MODE" in
    nano)
        printf "${LEARN_PRIMARY}o${RESET} D:${SLATE_300}${decisions_count}${RESET} L:${SLATE_300}${learnings_count}${RESET} S:${SLATE_300}${signals_count}${RESET}\n"
        ;;
    micro)
        printf "${LEARN_PRIMARY}o${RESET} D:${SLATE_300}${decisions_count}${RESET} L:${SLATE_300}${learnings_count}${RESET} S:${SLATE_300}${signals_count}${RESET}\n"
        ;;
    mini)
        printf "${LEARN_PRIMARY}o${RESET} ${LEARN_SECONDARY}MEMORY:${RESET} "
        printf "D:${SLATE_300}${decisions_count}${RESET} "
        printf "${SLATE_600}|${RESET} L:${SLATE_300}${learnings_count}${RESET} "
        printf "${SLATE_600}|${RESET} S:${SLATE_300}${signals_count}${RESET}\n"
        ;;
    normal)
        printf "${LEARN_PRIMARY}o${RESET} ${LEARN_SECONDARY}MEMORY:${RESET} "
        printf "${LEARN_WORK}D:${RESET}${SLATE_300}${decisions_count}${RESET} ${LEARN_WORK}Decisions${RESET} "
        printf "${SLATE_600}|${RESET} ${LEARN_SIGNALS}L:${RESET}${SLATE_300}${learnings_count}${RESET} ${LEARN_SIGNALS}Learnings${RESET} "
        printf "${SLATE_600}|${RESET} ${LEARN_SESSIONS}S:${RESET}${SLATE_300}${signals_count}${RESET} ${LEARN_SESSIONS}Signals${RESET}\n"
        ;;
esac

# ═══════════════════════════════════════════════════════════════════════════════
# LINE: SPRINT (from context/sprint-current.md)
# ═══════════════════════════════════════════════════════════════════════════════

if [ -n "$SPRINT_NAME" ]; then
    printf "${SLATE_600}------------------------------------------------------------------------${RESET}\n"
    case "$MODE" in
        nano)
            printf "${SPRINT_PRIMARY}*${RESET} ${SPRINT_VALUE}${SPRINT_NAME}${RESET}\n"
            ;;
        micro)
            printf "${SPRINT_PRIMARY}*${RESET} ${SPRINT_VALUE}${SPRINT_NAME}${RESET}"
            [ -n "$SPRINT_ISC_PROGRESS" ] && printf " ${SPRINT_ISC_CLR}${SPRINT_ISC_PROGRESS}${RESET}"
            printf "\n"
            ;;
        mini)
            printf "${SPRINT_PRIMARY}*${RESET} ${SPRINT_PRIMARY}SPRINT:${RESET} ${SPRINT_VALUE}${SPRINT_NAME}${RESET}"
            [ -n "$SPRINT_ISC" ] && printf " ${SLATE_600}|${RESET} ${SPRINT_ISC}${SPRINT_ISC}${RESET}"
            printf "\n"
            ;;
        normal)
            printf "${SPRINT_PRIMARY}*${RESET} ${SPRINT_PRIMARY}SPRINT:${RESET} ${SPRINT_VALUE}${SPRINT_NAME}${RESET}"
            [ -n "$SPRINT_ISC" ] && printf " ${SLATE_600}|${RESET} ${SPRINT_ISC}${SPRINT_ISC}${RESET}"
            printf "\n"
            ;;
    esac
fi

# ═══════════════════════════════════════════════════════════════════════════════
# LINE: LEARNING (with sparklines in normal mode)
# ═══════════════════════════════════════════════════════════════════════════════

if [ -f "$RATINGS_FILE" ] && [ -s "$RATINGS_FILE" ]; then
    printf "${SLATE_600}------------------------------------------------------------------------${RESET}\n"
    now=$(date +%s)

    # Check cache validity
    cache_valid=false
    if [ -f "$LEARNING_CACHE" ]; then
        cache_mtime=$(get_mtime "$LEARNING_CACHE")
        ratings_mtime=$(get_mtime "$RATINGS_FILE")
        cache_age=$((now - cache_mtime))
        if [ "$cache_mtime" -gt "$ratings_mtime" ] && [ "$cache_age" -lt 30 ]; then
            cache_valid=true
        fi
    fi

    if [ "$cache_valid" = true ]; then
        source "$LEARNING_CACHE"
    else
        eval "$(grep '^{' "$RATINGS_FILE" | jq -rs --argjson now "$now" '
      def to_epoch:
        (capture("(?<sign>[-+])(?<h>[0-9]{2}):(?<m>[0-9]{2})$") // {sign: "+", h: "00", m: "00"}) as $tz |
        gsub("[-+][0-9]{2}:[0-9]{2}$"; "Z") | gsub("\\.[0-9]+"; "") | fromdateiso8601 |
        . + (if $tz.sign == "-" then 1 else -1 end) * (($tz.h | tonumber) * 3600 + ($tz.m | tonumber) * 60);

      [.[] | select(.rating != null) | . + {epoch: (.timestamp | to_epoch)}] |

      ($now - 900) as $q15_start | ($now - 3600) as $hour_start | ($now - 86400) as $today_start |
      ($now - 604800) as $week_start | ($now - 2592000) as $month_start |

      (map(select(.epoch >= $q15_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $q15_avg |
      (map(select(.epoch >= $hour_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $hour_avg |
      (map(select(.epoch >= $today_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $today_avg |
      (map(select(.epoch >= $week_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $week_avg |
      (map(select(.epoch >= $month_start) | .rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $month_avg |
      (map(.rating) | if length > 0 then (add / length | . * 10 | floor / 10 | tostring) else "—" end) as $all_avg |

      def to_bar:
        floor |
        if . >= 10 then "\u001b[38;2;34;197;94m▅\u001b[0m"
        elif . >= 9 then "\u001b[38;2;74;222;128m▅\u001b[0m"
        elif . >= 8 then "\u001b[38;2;134;239;172m▄\u001b[0m"
        elif . >= 7 then "\u001b[38;2;59;130;246m▃\u001b[0m"
        elif . >= 6 then "\u001b[38;2;96;165;250m▂\u001b[0m"
        elif . >= 5 then "\u001b[38;2;253;224;71m▁\u001b[0m"
        elif . >= 4 then "\u001b[38;2;253;186;116m▂\u001b[0m"
        elif . >= 3 then "\u001b[38;2;251;146;60m▃\u001b[0m"
        elif . >= 2 then "\u001b[38;2;248;113;113m▄\u001b[0m"
        else "\u001b[38;2;239;68;68m▅\u001b[0m" end;

      def make_sparkline($period_start):
        . as $all | ($now - $period_start) as $dur | ($dur / 58) as $sz |
        [range(58) | . as $i | ($period_start + ($i * $sz)) as $s | ($s + $sz) as $e |
          [$all[] | select(.epoch >= $s and .epoch < $e) | .rating] |
          if length == 0 then "\u001b[38;2;45;50;60m \u001b[0m" else (add / length) | to_bar end
        ] | join("");

      (make_sparkline($q15_start)) as $q15_sparkline |
      (make_sparkline($hour_start)) as $hour_sparkline |
      (make_sparkline($today_start)) as $day_sparkline |
      (make_sparkline($week_start)) as $week_sparkline |
      (make_sparkline($month_start)) as $month_sparkline |

      def calc_trend($data):
        if ($data | length) >= 2 then
          (($data | length) / 2 | floor) as $half |
          ($data[-$half:] | add / length) as $recent |
          ($data[:$half] | add / length) as $older |
          ($recent - $older) | if . > 0.5 then "up" elif . < -0.5 then "down" else "stable" end
        else "stable" end;

      ([.[] | select(.epoch >= $hour_start) | .rating]) as $hour_data |
      ([.[] | select(.epoch >= $today_start) | .rating]) as $day_data |
      (calc_trend($hour_data)) as $hour_trend |
      (calc_trend($day_data)) as $day_trend |

      length as $total |
      (if $total >= 4 then
        (($total / 2) | floor) as $half |
        (.[- $half:] | map(.rating) | add / length) as $recent |
        (.[:$half] | map(.rating) | add / length) as $older |
        ($recent - $older) | if . > 0.3 then "up" elif . < -0.3 then "down" else "stable" end
      else "stable" end) as $trend |

      (last | .rating | tostring) as $latest |
      (last | .source // "explicit") as $latest_source |

      "latest=\($latest | @sh)\nlatest_source=\($latest_source | @sh)\n" +
      "q15_avg=\($q15_avg | @sh)\nhour_avg=\($hour_avg | @sh)\ntoday_avg=\($today_avg | @sh)\n" +
      "week_avg=\($week_avg | @sh)\nmonth_avg=\($month_avg | @sh)\nall_avg=\($all_avg | @sh)\n" +
      "q15_sparkline=\($q15_sparkline | @sh)\nhour_sparkline=\($hour_sparkline | @sh)\nday_sparkline=\($day_sparkline | @sh)\n" +
      "week_sparkline=\($week_sparkline | @sh)\nmonth_sparkline=\($month_sparkline | @sh)\n" +
      "hour_trend=\($hour_trend | @sh)\nday_trend=\($day_trend | @sh)\n" +
      "trend=\($trend | @sh)\ntotal_count=\($total)"
    ' 2>/dev/null)"

        # Save to cache
        mkdir -p "$(dirname "$LEARNING_CACHE")" 2>/dev/null
        cat > "$LEARNING_CACHE" << CACHE_EOF
latest='$latest'
latest_source='$latest_source'
q15_avg='$q15_avg'
hour_avg='$hour_avg'
today_avg='$today_avg'
week_avg='$week_avg'
month_avg='$month_avg'
all_avg='$all_avg'
q15_sparkline='$q15_sparkline'
hour_sparkline='$hour_sparkline'
day_sparkline='$day_sparkline'
week_sparkline='$week_sparkline'
month_sparkline='$month_sparkline'
hour_trend='$hour_trend'
day_trend='$day_trend'
trend='$trend'
total_count=$total_count
CACHE_EOF
    fi

    if [ "$total_count" -gt 0 ] 2>/dev/null; then
        case "$trend" in
            up)   trend_icon="+"; trend_color="$EMERALD" ;;
            down) trend_icon="-"; trend_color="$ROSE" ;;
            *)    trend_icon="="; trend_color="$SLATE_400" ;;
        esac

        [ "$q15_avg" != "—" ] && pulse_base="$q15_avg" || { [ "$hour_avg" != "—" ] && pulse_base="$hour_avg" || { [ "$today_avg" != "—" ] && pulse_base="$today_avg" || pulse_base="$all_avg"; }; }
        LATEST_COLOR=$(get_rating_color "${latest:-5}")
        Q15_COLOR=$(get_rating_color "${q15_avg:-5}")
        HOUR_COLOR=$(get_rating_color "${hour_avg:-5}")
        TODAY_COLOR=$(get_rating_color "${today_avg:-5}")
        WEEK_COLOR=$(get_rating_color "${week_avg:-5}")
        MONTH_COLOR=$(get_rating_color "${month_avg:-5}")

        [ "$latest_source" = "explicit" ] && src_label="EXP" || src_label="IMP"

        case "$MODE" in
            nano)
                printf "${LEARN_LABEL}~${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET}\n"
                ;;
            micro)
                printf "${LEARN_LABEL}~${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1h:${RESET} ${HOUR_COLOR}${hour_avg}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET} ${SIGNAL_PERIOD}1w:${RESET} ${WEEK_COLOR}${week_avg}${RESET}\n"
                ;;
            mini)
                printf "${LEARN_LABEL}~${RESET} ${LEARN_LABEL}LEARNING:${RESET} ${SLATE_600}|${RESET} "
                printf "${LATEST_COLOR}${latest}${RESET} "
                printf "${SIGNAL_PERIOD}1h:${RESET} ${HOUR_COLOR}${hour_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1w:${RESET} ${WEEK_COLOR}${week_avg}${RESET}\n"
                ;;
            normal)
                printf "${LEARN_LABEL}~${RESET} ${LEARN_LABEL}LEARNING:${RESET} ${SLATE_600}|${RESET} "
                printf "${LATEST_COLOR}${latest}${RESET}${SLATE_500}${src_label}${RESET} ${SLATE_600}|${RESET} "
                printf "${SIGNAL_PERIOD}15m:${RESET} ${Q15_COLOR}${q15_avg}${RESET} "
                printf "${SIGNAL_PERIOD}60m:${RESET} ${HOUR_COLOR}${hour_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1d:${RESET} ${TODAY_COLOR}${today_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1w:${RESET} ${WEEK_COLOR}${week_avg}${RESET} "
                printf "${SIGNAL_PERIOD}1mo:${RESET} ${MONTH_COLOR}${month_avg}${RESET}\n"

                # Sparklines
                printf "   ${SLATE_600}|-${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "15m:" "$q15_sparkline"
                printf "   ${SLATE_600}|-${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "60m:" "$hour_sparkline"
                printf "   ${SLATE_600}|-${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "1d:" "$day_sparkline"
                printf "   ${SLATE_600}|-${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "1w:" "$week_sparkline"
                printf "   ${SLATE_600}\\-${RESET} ${SIGNAL_PERIOD}%-5s${RESET} %s\n" "1mo:" "$month_sparkline"
                ;;
        esac
    else
        printf "${LEARN_LABEL}~${RESET} ${LEARN_LABEL}LEARNING:${RESET}\n"
        printf "  ${SLATE_500}No ratings yet${RESET}\n"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# LINE: QUOTE (normal mode only)
# ═══════════════════════════════════════════════════════════════════════════════

if [ "$MODE" = "normal" ]; then
    if [ -f "$QUOTE_CACHE" ]; then
        printf "${SLATE_600}------------------------------------------------------------------------${RESET}\n"

        IFS='|' read -r quote_text quote_author < "$QUOTE_CACHE"
        author_suffix="\" --${quote_author}"
        author_len=${#author_suffix}
        quote_len=${#quote_text}
        max_line=72

        full_len=$((quote_len + author_len + 4))

        if [ "$full_len" -le "$max_line" ]; then
            printf "${QUOTE_PRIMARY}*${RESET} ${SLATE_400}\"${quote_text}\"${RESET} ${QUOTE_AUTHOR}--${quote_author}${RESET}\n"
        else
            line1_text_max=60
            min_line2=12
            target_line1=$line1_text_max
            [ "$target_line1" -gt "$quote_len" ] && target_line1=$((quote_len - min_line2))

            first_part="${quote_text:0:$target_line1}"
            remaining="${quote_text:$target_line1}"

            if [ -n "$remaining" ] && [ "${remaining:0:1}" != " " ]; then
                temp="$first_part"
                last_space_pos=0
                pos=0
                while [ $pos -lt ${#temp} ]; do
                    [ "${temp:$pos:1}" = " " ] && last_space_pos=$pos
                    pos=$((pos + 1))
                done
                if [ $last_space_pos -gt 10 ]; then
                    first_part="${quote_text:0:$last_space_pos}"
                fi
            fi

            second_part="${quote_text:${#first_part}}"
            second_part="${second_part# }"

            if [ ${#second_part} -lt 10 ]; then
                printf "${QUOTE_PRIMARY}*${RESET} ${SLATE_400}\"${quote_text}\"${RESET} ${QUOTE_AUTHOR}--${quote_author}${RESET}\n"
            else
                printf "${QUOTE_PRIMARY}*${RESET} ${SLATE_400}\"${first_part}${RESET}\n"
                printf "  ${SLATE_400}${second_part}\"${RESET} ${QUOTE_AUTHOR}--${quote_author}${RESET}\n"
            fi
        fi
    fi
fi
