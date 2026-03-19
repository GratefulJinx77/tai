import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

interface PackageEntry {
  version: string;
  tier: string;
  description: string;
}

interface PackagesConfig {
  skills?: Record<string, PackageEntry>;
  agents?: Record<string, PackageEntry>;
  packages?: {
    required?: string[];
    recommended?: string[];
    optional?: string[];
  };
}

interface InstallOptions {
  all?: boolean;
}

export function install(packageName: string | undefined, options: InstallOptions): void {
  const cwd = process.cwd();
  const taiDir = join(cwd, ".tai");

  if (!existsSync(taiDir)) {
    console.error("Error: No .tai/ directory found. Run 'tai init' first.");
    process.exit(1);
  }

  const packagesPath = join(taiDir, "packages.yaml");
  if (!existsSync(packagesPath)) {
    console.error("Error: No packages.yaml found in .tai/");
    process.exit(1);
  }

  const raw = readFileSync(packagesPath, "utf-8");
  const config = parse(raw) as PackagesConfig;

  // Build package lists from either format
  let required: string[] = [];
  let recommended: string[] = [];
  let optional: string[] = [];

  if (config.skills || config.agents) {
    for (const [name, entry] of Object.entries(config.skills || {})) {
      if (entry.tier === 'required') required.push(name);
      else if (entry.tier === 'recommended') recommended.push(name);
      else optional.push(name);
    }
    for (const [name, entry] of Object.entries(config.agents || {})) {
      if (entry.tier === 'required') required.push(name);
      else if (entry.tier === 'recommended') recommended.push(name);
      else optional.push(name);
    }
  } else if (config.packages) {
    required = config.packages.required || [];
    recommended = config.packages.recommended || [];
    optional = config.packages.optional || [];
  }

  if (packageName) {
    // Install a specific package
    const allPackages = [...required, ...recommended, ...optional];
    if (!allPackages.includes(packageName)) {
      console.error(`Error: Package '${packageName}' not found in packages.yaml`);
      console.error(`Available: ${allPackages.join(", ")}`);
      process.exit(1);
    }
    installPackage(taiDir, packageName);
    return;
  }

  // Install by tier
  const toInstall = options.all
    ? [...required, ...recommended, ...optional]
    : [...required, ...recommended];

  console.log(`Installing ${toInstall.length} packages...`);
  console.log("");

  for (const pkg of toInstall) {
    installPackage(taiDir, pkg);
  }

  console.log("");
  console.log(`Installed ${toInstall.length} packages.`);

  if (!options.all && optional.length > 0) {
    console.log(`Optional packages available: ${optional.join(", ")}`);
    console.log("Run 'tai install --all' to include optional packages.");
  }
}

function installPackage(taiDir: string, name: string): void {
  const skillsDir = join(taiDir, "skills", name);
  const agentsDir = join(taiDir, "agents", name);

  const hasSkills = existsSync(skillsDir);
  const hasAgents = existsSync(agentsDir);

  if (hasSkills || hasAgents) {
    const parts: string[] = [];
    if (hasSkills) parts.push("skills");
    if (hasAgents) parts.push("agents");
    console.log(`  [ok] ${name} (${parts.join(" + ")})`);
  } else {
    console.log(`  [--] ${name} (not found in skills/ or agents/)`);
  }
}
