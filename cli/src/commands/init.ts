import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string, defaultValue = ""): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  return new Promise((resolve) => {
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function getGitConfig(key: string): string {
  try {
    return execSync(`git config ${key}`, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function getGitBranch(): string {
  try {
    return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
  } catch {
    return "main";
  }
}

interface InitOptions {
  force?: boolean;
  reconfigure?: boolean;
}

/**
 * Parse simple YAML values from team.yaml/project.yaml.
 * Not a full YAML parser — handles the flat key: "value" patterns we write.
 */
function loadExistingConfig(filePath: string): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(filePath)) return values;
  try {
    const lines = readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s+([\w_]+):\s*"?([^"]*)"?\s*$/);
      if (match) values[match[1]] = match[2];
    }
  } catch { /* ignore */ }
  return values;
}

export async function init(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const taiDir = join(cwd, ".tai");
  const isReconfigure = options.reconfigure === true;

  if (existsSync(taiDir) && !options.force && !isReconfigure) {
    console.error(
      "Error: .tai/ already exists. Use --force to overwrite or --reconfigure to update config."
    );
    process.exit(1);
  }

  if (isReconfigure && !existsSync(taiDir)) {
    console.error("Error: .tai/ not found. Use 'tai init' for fresh setup.");
    process.exit(1);
  }

  // Check prerequisites
  const missing: string[] = [];
  try { execSync("jq --version", { stdio: "ignore" }); } catch { missing.push("jq"); }
  try { execSync("bun --version", { stdio: "ignore" }); } catch { missing.push("bun"); }
  try { execSync("python3 --version", { stdio: "ignore" }); } catch { missing.push("python3"); }

  if (missing.length > 0) {
    console.error(`\nMissing required dependencies: ${missing.join(", ")}`);
    console.error("Install them before running tai init.");
    if (missing.includes("jq")) console.error("  jq: sudo apt install jq (Linux) / brew install jq (macOS)");
    if (missing.includes("bun")) console.error("  bun: curl -fsSL https://bun.sh/install | bash");
    process.exit(1);
  }

  const header = isReconfigure ? "TAI Reconfigure" : "TAI Init";
  console.log(`\n── ${header} ──────────────────────────────────\n`);
  console.log(isReconfigure
    ? "Updating team and project configuration. Hooks and memory are untouched.\n"
    : "Setting up Team AI Infrastructure.\n"
  );

  // Load existing config values as defaults for reconfigure
  const existingTeam = isReconfigure ? loadExistingConfig(join(taiDir, "config", "team.yaml")) : {};
  const existingProject = isReconfigure ? loadExistingConfig(join(taiDir, "config", "project.yaml")) : {};

  // Detect git info
  const gitName = getGitConfig("user.name");
  const gitEmail = getGitConfig("user.email");
  const gitRemote = getGitConfig("remote.origin.url");
  const gitHub = gitRemote.match(/github\.com[:/]([^/]+)/)?.[1] || "";
  const projectDir = cwd.split("/").pop() || "my-project";

  // ── Team Info ──
  console.log("── Team ──\n");
  const teamName = await ask("Team name", existingTeam.name || projectDir);
  const userName = await ask("Your name", existingTeam.name_member || gitName);
  const userEmail = await ask("Your email", existingTeam.email || gitEmail);
  const userGithub = await ask("Your GitHub username", existingTeam.github || gitHub);
  const userCity = await ask("Your city", existingTeam.city || "");
  const userState = await ask("Your state/region", existingTeam.state || "");

  // ── Project Info ──
  console.log("\n── Project ──\n");
  const projectName = await ask("Project name", existingProject.name || projectDir);
  const projectDesc = await ask("Description", existingProject.description || "");
  const language = await ask("Language", existingProject.language || detectLanguage(cwd));
  const framework = await ask("Framework", existingProject.framework || "");
  const database = await ask("Database", existingProject.database || "");
  const testRunner = await ask("Test runner", existingProject.test_runner || detectTestRunner(cwd));
  const linter = await ask("Linter", existingProject.linter || detectLinter(cwd));

  // ── Commands ──
  console.log("\n── Build Commands (leave empty to skip) ──\n");
  const buildCmd = await ask("Build", existingProject.build || detectCommand(cwd, "build"));
  const testCmd = await ask("Test", existingProject.test || detectCommand(cwd, "test"));
  const lintCmd = await ask("Lint", existingProject.lint || detectCommand(cwd, "lint"));
  const typeCheckCmd = await ask("Type check", existingProject.type_check || "");
  const devCmd = await ask("Dev server", existingProject.dev || detectCommand(cwd, "dev"));

  rl.close();

  // ── Scaffold (skip in reconfigure mode) ──
  if (!isReconfigure) {
  console.log("\n── Creating .tai/ ──\n");

  // Check if we're in the TAI source repo (has CORE.md to copy)
  const sourceDir = resolve(import.meta.dirname, "../../..");
  const sourceTaiDir = join(sourceDir, ".tai");
  const hasSource = existsSync(join(sourceTaiDir, "CORE.md"));

  if (hasSource && sourceTaiDir !== taiDir) {
    cpSync(sourceTaiDir, taiDir, { recursive: true });
    console.log("  Copied framework from TAI source repository.");
  } else {
    // Scaffold directories
    const dirs = [
      "config", "context", "hooks", "hooks/lib", "roles",
      "skills/core", "skills/custom",
      "agents/core", "agents/custom",
      "memory/decisions", "memory/learnings", "memory/state",
      "memory/signals", "memory/failures",
      "agent-memory", "telemetry", "templates",
    ];
    for (const dir of dirs) {
      mkdirSync(join(taiDir, dir), { recursive: true });
    }
    console.log("  Created directory structure.");
  }
  } // end if (!isReconfigure)

  // ── Write config files (always overwrite with interactive values) ──
  writeFileSync(
    join(taiDir, "config", "team.yaml"),
    `team:
  name: "${teamName}"
  admin_users: ["${userEmail}"]
  members:
    - name: "${userName}"
      email: "${userEmail}"
      github: "${userGithub}"
      default_role: dev
      location:
        city: "${userCity}"
        state: "${userState}"
  notifications:
    platform: ""
    webhook_url: ""
    channel: ""
`,
    "utf-8"
  );
  console.log("  Wrote config/team.yaml");

  writeFileSync(
    join(taiDir, "config", "project.yaml"),
    `project:
  name: "${projectName}"
  description: "${projectDesc}"

  stack:
    language: "${language}"
    framework: "${framework}"
    database: "${database}"
    build_tool: ""
    test_runner: "${testRunner}"
    linter: "${linter}"
    type_checker: ""

  commands:
    build: "${buildCmd}"
    test: "${testCmd}"
    lint: "${lintCmd}"
    type_check: "${typeCheckCmd}"
    dev: "${devCmd}"
`,
    "utf-8"
  );
  console.log("  Wrote config/project.yaml");

  // ── Run install.sh if available (skip in reconfigure mode) ──
  if (!isReconfigure) {
    const installScript = join(taiDir, "hooks", "install.sh");
    if (existsSync(installScript)) {
      console.log("\n── Installing hooks ──\n");
      try {
        execSync(`bash "${installScript}"`, { stdio: "inherit", cwd });
      } catch {
        console.error("  Warning: install.sh failed. Run it manually.");
      }
    }
  }

  // ── Summary ──
  const verb = isReconfigure ? "reconfigured" : "initialized";
  console.log("\n═══════════════════════════════════════════════");
  console.log(`  TAI ${verb} for ${teamName}`);
  console.log("═══════════════════════════════════════════════");
  console.log(`\n  Team:     ${teamName} (${userName})`);
  if (userCity) console.log(`  Location: ${userCity}${userState ? ", " + userState : ""}`);
  console.log(`  Project:  ${projectName} (${language}${framework ? " + " + framework : ""})`);
  if (!isReconfigure) console.log(`  Hooks:    installed via install.sh`);
  console.log(`\n  Next: launch Claude Code with 'claude'`);
  console.log("");
}

// ── Detection helpers ──

function detectLanguage(cwd: string): string {
  if (existsSync(join(cwd, "tsconfig.json"))) return "TypeScript";
  if (existsSync(join(cwd, "package.json"))) return "JavaScript";
  if (existsSync(join(cwd, "go.mod"))) return "Go";
  if (existsSync(join(cwd, "Cargo.toml"))) return "Rust";
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "requirements.txt"))) return "Python";
  if (existsSync(join(cwd, "Gemfile"))) return "Ruby";
  return "";
}

function detectTestRunner(cwd: string): string {
  try {
    const pkg = JSON.parse(execSync(`cat ${join(cwd, "package.json")}`, { encoding: "utf-8" }));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) return "Vitest";
    if (deps.jest) return "Jest";
    if (deps.mocha) return "Mocha";
  } catch { /* no package.json */ }
  if (existsSync(join(cwd, "pytest.ini")) || existsSync(join(cwd, "pyproject.toml"))) return "pytest";
  return "";
}

function detectLinter(cwd: string): string {
  if (existsSync(join(cwd, ".eslintrc.json")) || existsSync(join(cwd, ".eslintrc.js")) || existsSync(join(cwd, "eslint.config.js")) || existsSync(join(cwd, "eslint.config.mjs"))) return "ESLint";
  if (existsSync(join(cwd, ".ruff.toml")) || existsSync(join(cwd, "ruff.toml"))) return "Ruff";
  return "";
}

function detectCommand(cwd: string, script: string): string {
  try {
    const pkg = JSON.parse(execSync(`cat ${join(cwd, "package.json")}`, { encoding: "utf-8" }));
    if (pkg.scripts?.[script]) return `npm run ${script}`;
  } catch { /* no package.json */ }
  return "";
}
