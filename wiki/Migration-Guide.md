# Migration Guide

How to bring TAI into an existing project, whether you're starting from a plain CLAUDE.md setup or upgrading from TAI v1.x.

## Migrating from a Plain CLAUDE.md

If your project currently uses a CLAUDE.md file for AI context, TAI gives you structure, shared memory, and team conventions on top of that foundation.

### Step-by-Step

1. **Run the setup script**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
   ```

   This clones TAI, installs dependencies, and runs the interactive wizard. The wizard prompts for team name, your name, email, GitHub, city, state, project stack, and build commands — auto-detecting what it can from your project.

   If your CLAUDE.md has >500 bytes, it creates `.bootstrap-pending` so Claude extracts your architecture/boundaries/patterns on first session.

2. **Move architecture documentation**

   Copy architecture sections from your CLAUDE.md to `.tai/context/architecture.md`.

3. **Move boundary rules**

   Extract forbidden imports, service separation rules, and dependency constraints to `.tai/context/boundaries.md`.

4. **Move code conventions**

   Extract naming conventions, code patterns, and testing conventions to `.tai/context/patterns.md`.

5. **Trim CLAUDE.md**

   Reduce your CLAUDE.md to a project description and a pointer to `.tai/CORE.md`. TAI loads its own context automatically -- your CLAUDE.md no longer needs to carry all of it.

   ```markdown
   # My Project

   Brief project description.

   ## TAI

   This project uses TAI for team AI infrastructure.
   See `.tai/CORE.md` for the session initialization protocol.
   ```

9. **Commit everything**

    ```bash
    git add .tai/ CLAUDE.md
    git commit -m "Initialize TAI v2.0.0"
    ```

### What Moves Where

| Before (CLAUDE.md) | After (TAI) |
|---------------------|-------------|
| Architecture documentation | `.tai/context/architecture.md` |
| Boundary rules / forbidden imports | `.tai/context/boundaries.md` |
| Code conventions / naming rules | `.tai/context/patterns.md` |
| Sprint details | `.tai/context/sprint-current.md` |
| Team information | `.tai/config/team.yaml` |
| Project stack details | `.tai/config/project.yaml` |
| Architectural decisions (inline) | `.tai/memory/decisions/` (individual files) |

## Migrating from TAI v1.x

### Key Changes in v2.0

1. **Role system** -- `architect.md` and `developer.md` replaced with `dev.md`, `qa.md`, `pub.md`, `admin.md`
2. **Role assignment** -- `TAI_ROLE` environment variable removed; roles matched by git email only
3. **Admin mode** -- New `/tai-admin` command for TAI configuration
4. **team.yaml** -- `role` field renamed to `default_role`; `admin_users` array added
5. **Hook tiers** -- Renamed from block/warn/silent to required/recommended/optional
6. **Package system** -- New `packages.yaml` for skill and agent package management
7. **Slash commands** -- `/tai-validate`, `/tai-admin`, `/tai-sprint`, `/tai-decisions`, `/tai-health`

### Step-by-Step

1. **Replace role files**

   Remove old role files:
   ```bash
   rm .tai/roles/architect.md .tai/roles/developer.md
   ```

   Copy new role files from TAI v2.0:
   - `.tai/roles/dev.md`
   - `.tai/roles/qa.md`
   - `.tai/roles/pub.md`
   - `.tai/roles/admin.md`

2. **Update team.yaml**

   Replace `role` field with `default_role` and add `admin_users`:

   ```yaml
   # Before (v1.x)
   team:
     members:
       - name: "Alice"
         email: "alice@company.com"
         role: developer

   # After (v2.0)
   team:
     admin_users: ["alice@company.com"]
     members:
       - name: "Alice"
         email: "alice@company.com"
         github: "alice-gh"
         default_role: dev
   ```

3. **Remove TAI_ROLE environment variable usage**

   Roles are now matched by git email only. Remove any `TAI_ROLE` exports from shell profiles or CI scripts.

4. **Update CORE.md**

   Replace `.tai/CORE.md` with the v2.0 version from the TAI repository.

5. **Add new files**

   Copy from TAI v2.0:
   - `.tai/CONTEXT_ROUTING.md`
   - `.tai/PRDFORMAT.md`
   - `.tai/status-line.md`
   - `.tai/packages.yaml`
   - `.tai/config/models.yaml`
   - `.tai/hooks/settings-template.json`

6. **Bump version**

   ```bash
   echo "2.0.0" > .tai/VERSION
   ```

7. **Update hooks**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/GratefulJinx77/tai/main/setup.sh | bash
   ```

   This pulls the latest framework and re-registers hooks.

8. **Commit**

   ```bash
   git add .tai/
   git commit -m "Upgrade TAI to v2.0.0"
   ```

### Verification Checklist

After migration, verify:

- [ ] `echo '{"context_window":{"used_percentage":50}}' | bash .tai/hooks/statusline-command.sh 2>&1 | grep "%"` shows 50%
- [ ] Claude Code session starts and shows status line
- [ ] Your git email matches a `team.yaml` member
- [ ] Role context loads correctly (check status line Role field)
- [ ] Memory stores are accessible (check status line MEMORY field)
- [ ] Hooks are installed (`install.sh --list`)
- [ ] Hooks are registered in Claude Code settings
- [ ] Context files load at session start (architecture, boundaries, patterns)

## Related Pages

- [[Getting Started]] -- Fresh installation guide
- [[Governance]] -- Understanding the new role system
- [[Hook System]] -- Hook tier changes in v2.0
- [[CLI Reference]] -- New CLI commands
