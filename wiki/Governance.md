# Governance

TAI uses flat roles that shape context, not restrict access. Every team member can use every skill.

## Philosophy

Roles in TAI are **context shaping, not access gating**. When a QA engineer starts a session, they get quality-focused context loaded -- testing patterns, coverage goals, validation workflows. But they can still use any skill, run any query, and access any tool.

This is a deliberate design choice. AI-assisted development works best when context guides behavior rather than permissions blocking it.

## Four Roles

| Role | Focus | Loaded Context | Access |
|------|-------|----------------|--------|
| **Dev** | Default. Feature work, patterns, boundaries. | `.tai/roles/dev.md` | All skills, all queries |
| **QA** | Testing, coverage, validation emphasis. | `.tai/roles/qa.md` | All skills, all queries |
| **Pub** | Content, docs, public-facing assets. | `.tai/roles/pub.md` | All skills, all queries |
| **Admin** | TAI system configuration. | `.tai/roles/admin.md` | All skills + TAI config |

### Dev Role (Default)

The default role for all team members. Directives include:
- Follow patterns documented in `context/patterns.md`
- Respect boundaries documented in `context/boundaries.md`
- Run pre-pr checks before submitting PRs
- Write tests for new functionality
- Document architectural decisions in `memory/decisions/`

### QA Role

Quality-focused context emphasizing testing workflows, coverage analysis, and validation patterns.

### Pub Role

Content and public-facing asset focus -- documentation, marketing copy, user-facing content.

### Admin Role

Activated via `/tai-admin` command. Additive -- you retain all Dev capabilities plus TAI configuration access:
- Edit `hooks/config.yaml` (change hook tiers, add/remove hooks)
- Edit `config/team.yaml` (add/remove members, change `admin_users`)
- Edit `config/project.yaml` (update stack details)
- Edit `packages.yaml` (install/remove skill and agent packages)
- Run `tai` CLI commands (`init`, `install`, `update`)
- Modify context files (`architecture.md`, `boundaries.md`, `patterns.md`)

**Constraints:** Document all configuration changes in `memory/decisions/`. Notify team of hook tier changes. Version bump `.tai/VERSION` on significant changes.

## How Roles Are Assigned

TAI matches `git config user.email` against the `members` list in `.tai/config/team.yaml`. Each member has a `default_role` field:

```yaml
team:
  members:
    - name: "Alice"
      email: "alice@company.com"    # Matched against git config user.email
      github: "alice-gh"
      default_role: dev             # dev | qa | pub
    - name: "Bob"
      email: "bob@company.com"
      github: "bob-gh"
      default_role: qa
```

If no match is found, the session defaults to the **Dev** role.

## Admin Mode

### Who Can Activate

Only members listed in the `admin_users` array in `team.yaml`:

```yaml
team:
  admin_users: ["alice@company.com", "bob@company.com"]
```

### How to Activate

Run the `/tai-admin` command in your Claude Code session:

```
/tai-admin
```

This switches the current session to Admin mode by loading `.tai/roles/admin.md` context.

### What It Enables

- Full TAI system configuration (hooks, team membership, packages)
- All Dev capabilities are retained
- Session-scoped: admin mode ends when the session ends

### What It Does NOT Do

- Does not grant elevated code access (all roles already have full access)
- Does not persist across sessions
- Does not affect other team members' sessions

## team.yaml Configuration Reference

```yaml
team:
  name: "Project Name"                  # Team/project display name
  admin_users: ["admin@company.com"]    # Emails of members who can activate /tai-admin
  members:
    - name: "Display Name"              # Human-readable name
      email: "user@company.com"         # Must match git config user.email
      github: "github-username"         # GitHub username
      default_role: dev                 # dev | qa | pub
  notifications:
    platform: "slack"                   # teams | slack | discord
    webhook_url: ""                     # Webhook URL for notifications
    channel: ""                         # Target channel name
```

## Adding a New Team Member

1. Add their entry to `team.yaml` under `members`
2. Ensure their `email` matches their `git config user.email`
3. Choose an appropriate `default_role`
4. If they should be an admin, add their email to `admin_users`
5. Commit the change -- the new member is active on their next session

## Related Pages

- [[Hook System]] -- Enforcement mechanisms that apply to all roles
- [[Memory System]] -- Shared memory accessible to all roles
- [[Getting Started]] -- Initial team setup
