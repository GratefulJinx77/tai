# Status Line

TAI displays a rich terminal statusline at the bottom of every Claude Code session. It is rendered by `.tai/hooks/statusline-command.sh` and registered in `.claude/settings.local.json` by the installer.

## What You See

```
-- | TAI | --------------------------------------------------
LOC: Your City, State | 09:15 | 72°F Clear
ENV: CC: 2.1.81 | TAI:2.0.0 | Hooks: 31 | Role: dev | Team: My Project
------------------------------------------------------------------------
@ CONTEXT: ⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁⛁ 12%
------------------------------------------------------------------------
<> PWD: my-project | Branch: main | Age: 2h
------------------------------------------------------------------------
o MEMORY: D:3 Decisions | L:12 Learnings | S:5 Signals
------------------------------------------------------------------------
* SPRINT: Sprint 4: Auth Layer | 6/10 ISC
```

## Segments

### TAI Header
- **LOC**: Team member location + local time + weather
- **ENV**: Claude Code version, TAI version, hook count, role, team name

#### Location Resolution

Location is resolved in priority order:

1. **Per-member city** — `team.yaml` member matching your `git config user.email`, `location.city` field
2. **Team-level city** — `team.yaml` top-level `location.city` field
3. **IP geolocation** — `ip-api.com` API (cached 1 year)

Set your city via `tai init --reconfigure` or by editing `team.yaml` directly.

#### Weather

Weather is fetched from the [Open-Meteo API](https://open-meteo.com/) using lat/lon coordinates:

- If city is configured in `team.yaml`, coordinates are geocoded via the [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) (cached until city changes)
- If no city is configured, coordinates come from IP geolocation
- Weather is cached for 15 minutes
- Temperature unit defaults to Fahrenheit; set `temperatureUnit: celsius` in `project.yaml` to change

### CONTEXT
- **Source**: Claude Code's `context_window.used_percentage` from statusline JSON input
- **Display**: Gradient color bar (green → yellow → orange → red) with percentage
- **Requires**: `jq` installed on the system (without it, shows 0%)

### PWD
- **PWD**: Current project directory name
- **Branch**: Current git branch
- **Age**: Time since last commit

### MEMORY
- **D**: Decision count (files in `memory/decisions/` excluding INDEX.md and TEMPLATE.md)
- **L**: Learning count (files in `memory/learnings/`)
- **S**: Signal count (entries in `memory/signals/ratings.jsonl`)

### SPRINT
- **Source**: `.tai/context/sprint-current.md`
- **name**: Sprint name from first `# ` heading
- **ISC**: Checked `- [x]` vs total criteria count

## Responsive Modes

The statusline adapts to terminal width:

| Mode | Width | Display |
|------|-------|---------|
| **nano** | <35 cols | Minimal: bar + percentage only |
| **micro** | 35-54 | Compact with key metrics |
| **mini** | 55-79 | Balanced information density |
| **normal** | 80+ | Full display with all segments |

## How It Works

The statusline is a bash script registered in `.claude/settings.local.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": ".tai/hooks/statusline-command.sh"
  }
}
```

Claude Code pipes JSON session data to the script via stdin after each assistant message. The script parses it with `jq` and renders colored output using ANSI escape codes.

**Important:** The terminal statusline replaces any text-based status output. Claude should NOT output its own status line in text responses — the LoadContext hook enforces this.

## Troubleshooting

### Bar shows 0%
`jq` is not installed. Install it (`sudo apt install jq` / `brew install jq`) and restart the session.

### Statusline doesn't appear
Check `.claude/settings.local.json` exists and contains a `statusLine` key. Re-run `install.sh` if missing.

### Statusline shows stale data
Restart the Claude Code session. Settings changes aren't fully applied mid-session.

### Weather shows wrong location
The weather API uses cached lat/lon coordinates. If you changed your city in `team.yaml`, delete the stale caches:
```bash
rm -f .tai/memory/state/location-cache.json .tai/memory/state/weather-cache.json
```
The statusline will re-geocode your configured city on the next render.

## Related Pages

- [[Getting Started]] -- What you see on first launch
- [[Architecture]] -- Status line in the broader system
- [[FAQ]] -- Common troubleshooting
