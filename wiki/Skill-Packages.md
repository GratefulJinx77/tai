# Skill Packages

Skills are workflow definitions organized into packages. TAI ships with 10 skill packages covering development, research, security, and utility workflows.

## Package Architecture

Skills live in `.tai/skills/{package-name}/` directories. Each package contains one or more skill definitions -- workflow markdown files that define triggers, steps, and verification criteria.

Packages are registered in `.tai/packages.yaml`, which serves as the central registry for both skill packages and agent packages.

## packages.yaml Reference

```yaml
skills:
  core:
    version: "1.0.0"
    tier: required
    description: "TAI core development, quality, architecture, project, and query skills"
  thinking:
    version: "1.0.0"
    tier: required
    description: "First principles, council debates, red teaming, brainstorming, science"
  research:
    version: "1.0.0"
    tier: required
    description: "Multi-agent research, content extraction, web search"
  security:
    version: "1.0.0"
    tier: recommended
    description: "Reconnaissance, web assessment, prompt injection testing"
  agents:
    version: "1.0.0"
    tier: required
    description: "Custom agent composition, parallel spawning, trait system"
  media:
    version: "1.0.0"
    tier: optional
    description: "Art, diagrams, mermaid, video, illustrations"
  content-analysis:
    version: "1.0.0"
    tier: optional
    description: "Wisdom extraction from videos, podcasts, articles"
  scraping:
    version: "1.0.0"
    tier: optional
    description: "Web scraping via Bright Data proxy and Apify actors"
  utilities:
    version: "1.0.0"
    tier: recommended
    description: "CLI generation, skill scaffolding, browser automation"
  project-audit:
    version: "1.0.0"
    tier: recommended
    description: "Parallel agent accuracy audit for any codebase"
```

## Three Tiers

| Tier | Install Behavior | Packages |
|------|-----------------|----------|
| **Required** | Always installed | core, thinking, research, agents |
| **Recommended** | Installed by default, skippable | security, utilities, project-audit |
| **Optional** | Install explicitly | media, content-analysis, scraping |

## Package Inventory

### Required Packages

**core** -- TAI core development, quality, architecture, project, and query skills. Includes `tai-admin`, `tai-sprint`, `pre-pr`, `new-endpoint`, `new-component`, `new-migration`, `security-check`, `test-generation`, `review-pr`, `boundary-audit`, `sprint-planning`, and query skills like `tai-health` and `tai-usage`.

**thinking** -- First principles analysis, council debates, red teaming, brainstorming, and scientific methodology. Includes the Algorithm execution methodology and deep-think workflows.

**research** -- Multi-agent research workflows, content extraction, and web search. Supports parallel research agents for comprehensive information gathering.

**agents** -- Custom agent composition, parallel spawning, and the trait system. Infrastructure for building and managing AI agents.

### Recommended Packages

**security** -- Reconnaissance, web assessment, and prompt injection testing. Security-focused analysis workflows.

**utilities** -- CLI generation (`CreateCLI`), skill scaffolding, browser automation recipes, document processing (PDF, DOCX, PPTX), audio editing, Fabric pattern execution, and evaluation frameworks.

**project-audit** -- Parallel agent accuracy audit for any codebase. Spawns multiple agents to verify documentation, tests, and code consistency.

### Optional Packages

**media** -- Art generation, diagrams, Mermaid chart creation, video workflows, and illustrations.

**content-analysis** -- Wisdom extraction from videos, podcasts, and articles. Structured analysis of media content.

**scraping** -- Web scraping via Bright Data proxy and Apify actors. Automated data collection workflows.

## Installing Packages

```bash
# Install all required + recommended packages
tai install

# Install a specific package
tai install security

# Install all packages (required + recommended + optional)
tai install --all

# Check installed packages
tai status
```

## Building Custom Skills

### Directory Structure

```
.tai/skills/custom/
└── my-skill/
    ├── SKILL.md          # Skill definition
    └── (supporting files)
```

### SKILL.md Format

A skill definition file contains:

```markdown
# Skill Name

Description of what this skill does.

## Trigger

How this skill is invoked (e.g., `/my-skill` command).

## Steps

1. Step one description
2. Step two description
3. ...

## Verification

How to verify the skill completed successfully.
```

### Registration

Custom skills placed in `.tai/skills/custom/` are automatically available in Claude Code sessions. No registration in `packages.yaml` is needed for custom skills.

To add a custom skill to a package for distribution, add it to the appropriate package directory and update `packages.yaml`.

## Related Pages

- [[Agents]] -- Agent packages registered in the same `packages.yaml`
- [[CLI Reference]] -- `tai install` and `tai status` commands
- [[Getting Started]] -- Initial package installation
