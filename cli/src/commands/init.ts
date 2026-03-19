import { existsSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";

const SCAFFOLD_DIRS = [
  "config",
  "context",
  "hooks",
  "hooks/lib",
  "roles",
  "skills/core",
  "skills/custom",
  "agents/core",
  "agents/custom",
  "memory/decisions",
  "memory/learnings",
  "memory/state",
  "memory/signals",
  "memory/failures",
  "agent-memory",
  "telemetry",
  "templates",
];

const SCAFFOLD_FILES: Record<string, string> = {
  VERSION: "2.0.0\n",
  "config/team.yaml": `team:
  name: ""
  admin_users: []
  members:
    - name: ""
      email: ""
      github: ""
      default_role: dev
  notifications:
    platform: ""
    webhook_url: ""
    channel: ""
`,
  "config/project.yaml": `project:
  name: ""
  stack:
    language: ""
    test_runner: ""
  commands:
    build: ""
    test: ""
    lint: ""
    type_check: ""
`,
  "config/models.yaml": `models:
  default: claude-sonnet-4-20250514
  thinking: claude-opus-4-20250514
  fast: claude-haiku-4-5-20251001
`,
  "context/architecture.md": `# Architecture

<!-- Document your system architecture here -->
`,
  "context/boundaries.md": `# Boundaries

<!-- Document forbidden imports and service separation rules here -->
`,
  "context/patterns.md": `# Team Patterns & Conventions

## Naming Conventions
<!-- pattern: description -->
<!-- example: correct usage -->
<!-- counter-example: incorrect usage -->

## File Organization

## Code Patterns

## Testing Conventions
`,
  "context/sprint-current.md": `# Sprint 0: Setup

## Objectives
- Initialize TAI in the project
- Configure team members
- Define boundaries and patterns
- Install hooks

## ISC
- [ ] ISC-1: team.yaml has all team members configured
- [ ] ISC-2: project.yaml has correct stack and commands
- [ ] ISC-3: boundaries.md has at least one boundary rule
- [ ] ISC-4: patterns.md has at least one convention
- [ ] ISC-5: Git hooks are installed and passing
- [ ] ISC-6: All team members can start a TAI session
`,
  "memory/decisions/INDEX.md": `# Decision Index

<!-- Decisions are added here as they are made -->
`,
  "memory/learnings/summary.md": `# Team Learnings

<!-- Synthesized monthly from session learnings -->
`,
  "memory/state/current.md": `# Current State

## Active Sprint
None

## Active Work Items
None
`,
  "packages.yaml": `packages:
  required:
    - core
  recommended:
    - development
    - quality
    - architecture
  optional:
    - thinking
    - research
    - security
    - content-analysis
    - media
`,
};

interface InitOptions {
  force?: boolean;
}

export function init(options: InitOptions): void {
  const cwd = process.cwd();
  const taiDir = join(cwd, ".tai");

  if (existsSync(taiDir) && !options.force) {
    console.error(
      "Error: .tai/ already exists. Use --force to overwrite."
    );
    process.exit(1);
  }

  // Check if we're in the TAI source repo (has CORE.md to copy)
  const sourceDir = resolve(import.meta.dirname, "../../..");
  const sourceTaiDir = join(sourceDir, ".tai");
  const hasSource = existsSync(join(sourceTaiDir, "CORE.md"));

  if (hasSource && sourceTaiDir !== taiDir) {
    // Copy from source
    cpSync(sourceTaiDir, taiDir, { recursive: true });
    console.log("Initialized .tai/ from TAI source repository.");
  } else {
    // Scaffold from templates
    for (const dir of SCAFFOLD_DIRS) {
      mkdirSync(join(taiDir, dir), { recursive: true });
    }

    for (const [file, content] of Object.entries(SCAFFOLD_FILES)) {
      const filePath = join(taiDir, file);
      if (!existsSync(filePath) || options.force) {
        writeFileSync(filePath, content, "utf-8");
      }
    }

    // Copy CORE.md and role files
    const coreContent = `# TAI Session Protocol

See the TAI repository for the full CORE.md content.
Initialize from the TAI repo for a complete setup.
`;
    writeFileSync(join(taiDir, "CORE.md"), coreContent, "utf-8");

    // Write role files
    const roles: Record<string, string> = {
      "roles/dev.md": `# Dev Role\n\nDefault role for all team members.\nFull access to all skills, queries, and tools.\n`,
      "roles/qa.md": `# QA Role\n\nQuality-focused team member.\nSame access as Dev, context emphasizes testing and validation.\n`,
      "roles/pub.md": `# Pub Role\n\nPublic-facing content team member.\nSame access as Dev, context emphasizes content quality.\n`,
      "roles/admin.md": `# Admin Role\n\nTAI system administrator. Activated via /tai-admin.\nRetains all Dev capabilities plus TAI configuration.\n`,
    };

    for (const [file, content] of Object.entries(roles)) {
      writeFileSync(join(taiDir, file), content, "utf-8");
    }

    console.log("Initialized .tai/ with scaffold template.");
  }

  console.log("");
  console.log("Next steps:");
  console.log("  1. Edit .tai/config/team.yaml with your team members");
  console.log("  2. Edit .tai/config/project.yaml with your stack");
  console.log("  3. Add boundaries to .tai/context/boundaries.md");
  console.log("  4. Run .tai/hooks/install.sh to install git hooks");
  console.log("  5. Launch Claude Code");
}
