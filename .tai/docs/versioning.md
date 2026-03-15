# TAI Versioning

## VERSION File

- **Location:** `.tai/VERSION`
- **Format:** Semantic versioning — `MAJOR.MINOR.PATCH`
- **Current version:** Read from `.tai/VERSION` at session start

## When to Bump

### PATCH (x.y.Z)

Backward-compatible fixes and additions:

- Bug fixes in hooks or skills
- Telemetry schema additions (new fields, new event types)
- Documentation updates
- Template improvements

### MINOR (x.Y.0)

New capabilities, no breaking changes:

- New skills added to `.tai/skills/`
- New hooks added to `.tai/hooks/`
- New config fields added to team.yaml or project.yaml
- New templates added to `.tai/templates/`
- New context files added to `.tai/context/`

### MAJOR (X.0.0)

Breaking changes that require migration:

- Changes to CORE.md protocol (session init, role resolution, hook contract)
- Config schema changes (renamed or removed fields in team.yaml/project.yaml)
- Hook interface changes (different arguments, changed exit code semantics)
- Removal of existing skills, hooks, or config fields

## How to Bump

1. Edit `.tai/VERSION` with the new version number
2. Commit with message: `chore: bump TAI to vX.Y.Z`

## CORE.md Integration

On session init, CORE.md reads `.tai/VERSION` and displays it in the status line:

```
TAI v1.2.0 | Role: developer | Sprint: current
```

### Optional: Minimum Version Check

Teams can add a `minimum_tai_version` field to `team.yaml`:

```yaml
team:
  minimum_tai_version: "1.2.0"
```

If the local `.tai/VERSION` is lower than `minimum_tai_version`, CORE.md displays a warning:

```
WARNING: Local TAI version (1.1.0) is below team minimum (1.2.0). Run `git pull` to update.
```

This check is advisory — it does not block work.
