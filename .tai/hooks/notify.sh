#!/usr/bin/env bash
# TAI Notification Hook
# Sends webhook notifications for notable events.
# Advisory only — always exits 0.

TAI_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)/.tai" || TAI_ROOT=".tai"
TEAM_YAML="$TAI_ROOT/config/team.yaml"

# Read notification config from team.yaml
read_config() {
    local key="$1"
    if [ -f "$TEAM_YAML" ]; then
        grep "^    ${key}:" "$TEAM_YAML" 2>/dev/null | sed "s/^    ${key}: *//" | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//"
    fi
}

PLATFORM="$(read_config "platform")"
WEBHOOK_URL="$(read_config "webhook_url")"
CHANNEL="$(read_config "channel")"

# If no webhook URL configured, skip silently
if [ -z "$WEBHOOK_URL" ]; then
    exit 0
fi

# If no platform configured, skip silently
if [ -z "$PLATFORM" ]; then
    exit 0
fi

# Arguments: event_type message
EVENT_TYPE="${1:-}"
MESSAGE="${2:-}"

if [ -z "$EVENT_TYPE" ] || [ -z "$MESSAGE" ]; then
    echo "TAI notify: Usage: notify.sh <event_type> <message>" >&2
    exit 0
fi

# Build payload based on platform
build_payload() {
    local event="$1"
    local msg="$2"

    case "$PLATFORM" in
        teams)
            cat <<EOF
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.4",
      "body": [
        {
          "type": "TextBlock",
          "text": "TAI: ${event}",
          "weight": "Bolder",
          "size": "Medium"
        },
        {
          "type": "TextBlock",
          "text": "$(echo "$msg" | sed 's/"/\\"/g')",
          "wrap": true
        }
      ]
    }
  }]
}
EOF
            ;;
        slack)
            cat <<EOF
{
  "channel": "${CHANNEL}",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "TAI: ${event}"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "$(echo "$msg" | sed 's/"/\\"/g')"
      }
    }
  ]
}
EOF
            ;;
        discord)
            cat <<EOF
{
  "embeds": [{
    "title": "TAI: ${event}",
    "description": "$(echo "$msg" | sed 's/"/\\"/g')",
    "color": 3447003
  }]
}
EOF
            ;;
        *)
            echo "TAI notify: Unknown platform '$PLATFORM'" >&2
            return 1
            ;;
    esac
}

PAYLOAD="$(build_payload "$EVENT_TYPE" "$MESSAGE")" || exit 0

# Send webhook — fire and forget, never block
curl -s -o /dev/null -w "" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    --connect-timeout 5 \
    --max-time 10 2>/dev/null || true

# Always exit 0 — notifications are advisory
exit 0
