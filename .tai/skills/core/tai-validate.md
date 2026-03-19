# /tai-validate

Validate the TAI installation in the current project. Checks all components: rules, hooks, settings, memory, statusline, git hooks, context files, and packages.

## Trigger
User runs /tai-validate

## Steps

### 1. Core Files
Run these checks and report pass/fail for each:
```bash
# Check .tai/ exists
test -d .tai && echo "PASS: .tai/ directory exists" || echo "FAIL: .tai/ directory not found"

# Check VERSION
test -f .tai/VERSION && echo "PASS: VERSION = $(cat .tai/VERSION)" || echo "FAIL: .tai/VERSION missing"

# Check CORE.md
test -f .tai/CORE.md && echo "PASS: CORE.md exists" || echo "FAIL: CORE.md missing"

# Check CONTEXT_ROUTING.md
test -f .tai/CONTEXT_ROUTING.md && echo "PASS: CONTEXT_ROUTING.md exists" || echo "FAIL: CONTEXT_ROUTING.md missing"

# Check PRDFORMAT.md
test -f .tai/PRDFORMAT.md && echo "PASS: PRDFORMAT.md exists" || echo "FAIL: PRDFORMAT.md missing"
```

### 2. Claude Code Integration
```bash
# Check rules file
test -f .claude/rules/tai.md && echo "PASS: .claude/rules/tai.md installed" || echo "FAIL: .claude/rules/tai.md missing — run .tai/hooks/install.sh"

# Check settings.local.json has hooks
test -f .claude/settings.local.json && echo "PASS: settings.local.json exists" || echo "FAIL: settings.local.json missing — run .tai/hooks/install.sh"

# Check statusLine registered
grep -q "statusLine" .claude/settings.local.json 2>/dev/null && echo "PASS: statusLine registered" || echo "FAIL: statusLine not in settings.local.json"

# Check SessionStart hook registered
grep -q "SessionStart" .claude/settings.local.json 2>/dev/null && echo "PASS: SessionStart hooks registered" || echo "FAIL: SessionStart hooks not registered"

# Count registered hook events
hook_events=$(grep -c '"hooks"' .claude/settings.local.json 2>/dev/null || echo 0)
echo "INFO: $hook_events hook event groups registered"
```

### 3. Git Hooks
```bash
# Check pre-commit
test -L .git/hooks/pre-commit && echo "PASS: pre-commit symlinked to TAI" || echo "WARN: pre-commit not installed (run .tai/hooks/install.sh)"

# Check pre-push
test -L .git/hooks/pre-push && echo "PASS: pre-push symlinked to TAI" || echo "WARN: pre-push not installed (run .tai/hooks/install.sh)"
```

### 4. Config Files
```bash
# Check team.yaml
test -f .tai/config/team.yaml && echo "PASS: team.yaml exists" || echo "FAIL: team.yaml missing"

# Check if team.yaml has members configured
grep -q "email:" .tai/config/team.yaml 2>/dev/null && echo "PASS: team.yaml has members" || echo "WARN: team.yaml has no members configured"

# Check project.yaml
test -f .tai/config/project.yaml && echo "PASS: project.yaml exists" || echo "FAIL: project.yaml missing"

# Check models.yaml
test -f .tai/config/models.yaml && echo "PASS: models.yaml exists" || echo "FAIL: models.yaml missing"
```

### 5. Governance Roles
```bash
for role in dev qa pub admin; do
  test -f .tai/roles/${role}.md && echo "PASS: roles/${role}.md exists" || echo "FAIL: roles/${role}.md missing"
done

# Check old roles removed
test -f .tai/roles/architect.md && echo "FAIL: old architect.md still exists" || echo "PASS: architect.md removed"
test -f .tai/roles/developer.md && echo "FAIL: old developer.md still exists" || echo "PASS: developer.md removed"
```

### 6. Memory System
```bash
for dir in decisions learnings state signals failures; do
  test -d .tai/memory/${dir} && echo "PASS: memory/${dir}/ exists" || echo "FAIL: memory/${dir}/ missing"
done

test -f .tai/memory/decisions/INDEX.md && echo "PASS: decisions/INDEX.md exists" || echo "FAIL: decisions/INDEX.md missing"
test -f .tai/memory/decisions/TEMPLATE.md && echo "PASS: decisions/TEMPLATE.md exists" || echo "FAIL: decisions/TEMPLATE.md missing"
test -f .tai/memory/state/current.md && echo "PASS: state/current.md exists" || echo "FAIL: state/current.md missing"
test -f .tai/memory/learnings/summary.md && echo "PASS: learnings/summary.md exists" || echo "FAIL: learnings/summary.md missing"

# Count decisions
decision_count=$(find .tai/memory/decisions -name "*.md" ! -name "INDEX.md" ! -name "TEMPLATE.md" 2>/dev/null | wc -l)
echo "INFO: $decision_count decisions recorded"
```

### 7. Hook Files
```bash
# Count hook files
hook_count=$(ls .tai/hooks/*.hook.ts 2>/dev/null | wc -l)
echo "INFO: $hook_count TypeScript hooks present"

# Check key hooks exist
for hook in LoadContext PreCompact PostCompact SecurityValidator DeployVerify PRDSync; do
  test -f .tai/hooks/${hook}.hook.ts && echo "PASS: ${hook}.hook.ts exists" || echo "FAIL: ${hook}.hook.ts missing"
done

# Check lib modules
lib_count=$(ls .tai/hooks/lib/*.ts 2>/dev/null | wc -l)
echo "INFO: $lib_count lib modules present"

# Check statusline script
test -f .tai/hooks/statusline-command.sh && echo "PASS: statusline-command.sh exists" || echo "FAIL: statusline-command.sh missing"
test -x .tai/hooks/statusline-command.sh && echo "PASS: statusline-command.sh is executable" || echo "WARN: statusline-command.sh not executable"

# Check config.yaml
test -f .tai/hooks/config.yaml && echo "PASS: hooks/config.yaml exists" || echo "FAIL: hooks/config.yaml missing"
```

### 8. Skill Packages
```bash
# Check packages.yaml
test -f .tai/packages.yaml && echo "PASS: packages.yaml exists" || echo "FAIL: packages.yaml missing"

# Count skill packages
pkg_count=$(ls -d .tai/skills/*/ 2>/dev/null | wc -l)
echo "INFO: $pkg_count skill packages present"

# Check required packages
for pkg in core thinking research agents; do
  test -d .tai/skills/${pkg} && echo "PASS: skills/${pkg}/ exists" || echo "FAIL: required package skills/${pkg}/ missing"
done
```

### 9. Agents
```bash
# Count agent groups
agent_groups=$(ls -d .tai/agents/*/ 2>/dev/null | wc -l)
echo "INFO: $agent_groups agent groups present"

# Check core agents
for agent in Engineer Architect Designer QATester; do
  test -f .tai/agents/core/${agent}.md && echo "PASS: agents/core/${agent}.md exists" || echo "FAIL: agents/core/${agent}.md missing"
done

# Check Algorithm
test -f .tai/agents/execution/Algorithm.md && echo "PASS: Algorithm agent exists" || echo "FAIL: Algorithm agent missing"
```

### 10. Anti-Criteria
```bash
# No PAI paths
pai_refs=$(grep -r '~/.claude/' .tai/ 2>/dev/null | wc -l)
echo "$( [ $pai_refs -eq 0 ] && echo 'PASS' || echo 'FAIL'): $pai_refs PAI path references (should be 0)"

# No role access restrictions
role_gates=$(grep -r 'Role Access' .tai/skills/ 2>/dev/null | wc -l)
echo "$( [ $role_gates -eq 0 ] && echo 'PASS' || echo 'FAIL'): $role_gates role access restrictions (should be 0)"
```

### 11. Context Files
```bash
for ctx in architecture boundaries patterns sprint-current; do
  test -f .tai/context/${ctx}.md && echo "PASS: context/${ctx}.md exists" || echo "WARN: context/${ctx}.md missing or not populated"
done
```

## Output Format

Display results as a summary table:

```
── │ TAI VALIDATION │ ──────────────────────────
Version: {version}
─────────────────────────────────────────────────
  Core Files:       {pass}/{total}
  Claude Integration: {pass}/{total}
  Git Hooks:        {pass}/{total}
  Config:           {pass}/{total}
  Governance:       {pass}/{total}
  Memory System:    {pass}/{total}
  Hook Files:       {pass}/{total}
  Skill Packages:   {pass}/{total}
  Agents:           {pass}/{total}
  Anti-Criteria:    {pass}/{total}
  Context Files:    {pass}/{total}
─────────────────────────────────────────────────
  TOTAL: {pass}/{total} checks passed
  STATUS: {HEALTHY | NEEDS ATTENTION | BROKEN}
─────────────────────────────────────────────────
```

If any FAIL results, list them with remediation steps.
