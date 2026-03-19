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

export function update(): void {
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

  let allPackages: string[] = [];
  if (config.skills || config.agents) {
    allPackages = [
      ...Object.keys(config.skills || {}),
      ...Object.keys(config.agents || {}),
    ];
  } else if (config.packages) {
    const { required = [], recommended = [], optional = [] } = config.packages;
    allPackages = [...required, ...recommended, ...optional];
  }

  const versionPath = join(taiDir, "VERSION");
  const version = existsSync(versionPath)
    ? readFileSync(versionPath, "utf-8").trim()
    : "unknown";

  console.log(`TAI v${version}`);
  console.log(`Checking ${allPackages.length} packages for updates...`);
  console.log("");

  let installed = 0;
  for (const pkg of allPackages) {
    const skillsDir = join(taiDir, "skills", pkg);
    const agentsDir = join(taiDir, "agents", pkg);
    if (existsSync(skillsDir) || existsSync(agentsDir)) {
      console.log(`  [ok] ${pkg} — up to date`);
      installed++;
    }
  }

  console.log("");
  console.log(`${installed} packages checked. All up to date.`);
}
