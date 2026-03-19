import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

interface PackageEntry {
  version: string;
  tier: string;
  description: string;
}

interface PackagesConfig {
  // New format: skills/agents as top-level with named packages
  skills?: Record<string, PackageEntry>;
  agents?: Record<string, PackageEntry>;
  // Legacy format: packages.required/recommended/optional
  packages?: {
    required?: string[];
    recommended?: string[];
    optional?: string[];
  };
}

interface TeamConfig {
  team: {
    name: string;
    admin_users: string[];
    members: Array<{
      name: string;
      email: string;
      default_role: string;
    }>;
  };
}

export function status(): void {
  const cwd = process.cwd();
  const taiDir = join(cwd, ".tai");

  if (!existsSync(taiDir)) {
    console.error("Error: No .tai/ directory found. Run 'tai init' first.");
    process.exit(1);
  }

  // Version
  const versionPath = join(taiDir, "VERSION");
  const version = existsSync(versionPath)
    ? readFileSync(versionPath, "utf-8").trim()
    : "unknown";

  console.log(`TAI v${version}`);
  console.log("─".repeat(48));

  // Team
  const teamPath = join(taiDir, "config", "team.yaml");
  if (existsSync(teamPath)) {
    const teamConfig = parse(readFileSync(teamPath, "utf-8")) as TeamConfig;
    const members = teamConfig.team?.members ?? [];
    const teamName = teamConfig.team?.name || "(unnamed)";
    console.log(`\nTeam: ${teamName}`);
    console.log(`Members: ${members.length}`);
    for (const m of members) {
      if (m.name) {
        console.log(`  - ${m.name} (${m.default_role || "dev"})`);
      }
    }
  }

  // Packages
  const packagesPath = join(taiDir, "packages.yaml");
  if (existsSync(packagesPath)) {
    const config = parse(readFileSync(packagesPath, "utf-8")) as PackagesConfig;

    if (config.skills || config.agents) {
      // New format: skills/agents as top-level with named packages
      const allEntries: Array<{ name: string; type: string; tier: string }> = [];
      for (const [name, entry] of Object.entries(config.skills || {})) {
        allEntries.push({ name, type: 'skill', tier: entry.tier || 'optional' });
      }
      for (const [name, entry] of Object.entries(config.agents || {})) {
        allEntries.push({ name, type: 'agent', tier: entry.tier || 'optional' });
      }

      let installed = 0;
      for (const entry of allEntries) {
        if (
          existsSync(join(taiDir, "skills", entry.name)) ||
          existsSync(join(taiDir, "agents", entry.name))
        ) {
          installed++;
        }
      }

      const required = allEntries.filter(e => e.tier === 'required').map(e => e.name);
      const recommended = allEntries.filter(e => e.tier === 'recommended').map(e => e.name);
      const optional = allEntries.filter(e => e.tier === 'optional').map(e => e.name);

      console.log(`\nPackages: ${installed}/${allEntries.length} installed`);
      console.log(`  Required: ${required.join(", ") || "none"}`);
      console.log(`  Recommended: ${recommended.join(", ") || "none"}`);
      console.log(`  Optional: ${optional.join(", ") || "none"}`);
    } else if (config.packages) {
      // Legacy format: packages.required/recommended/optional
      const { required = [], recommended = [], optional = [] } = config.packages;
      const allPackages = [...required, ...recommended, ...optional];

      let installed = 0;
      for (const pkg of allPackages) {
        if (
          existsSync(join(taiDir, "skills", pkg)) ||
          existsSync(join(taiDir, "agents", pkg))
        ) {
          installed++;
        }
      }

      console.log(`\nPackages: ${installed}/${allPackages.length} installed`);
      console.log(`  Required: ${required.join(", ") || "none"}`);
      console.log(`  Recommended: ${recommended.join(", ") || "none"}`);
      console.log(`  Optional: ${optional.join(", ") || "none"}`);
    }
  }

  // Hooks
  const hooksDir = join(taiDir, "hooks");
  if (existsSync(hooksDir)) {
    const hookFiles = readdirSync(hooksDir).filter(
      (f) => f.endsWith(".sh") || f.endsWith(".hook.ts")
    );
    console.log(`\nHooks: ${hookFiles.length} defined`);
    for (const h of hookFiles) {
      console.log(`  - ${h}`);
    }
  }

  // Memory
  console.log("\nMemory:");
  const memoryStores = ["decisions", "learnings", "state", "signals", "failures"];
  for (const store of memoryStores) {
    const storeDir = join(taiDir, "memory", store);
    if (existsSync(storeDir)) {
      const files = readdirSync(storeDir).filter((f) => !f.startsWith("."));
      console.log(`  ${store}: ${files.length} files`);
    } else {
      console.log(`  ${store}: (not created)`);
    }
  }

  // Roles
  const rolesDir = join(taiDir, "roles");
  if (existsSync(rolesDir)) {
    const roles = readdirSync(rolesDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
    console.log(`\nRoles: ${roles.join(", ")}`);
  }

  console.log("");
}
