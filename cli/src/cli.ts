#!/usr/bin/env node

import { Command } from "commander";
import { init } from "./commands/init.js";
import { install } from "./commands/install.js";
import { update } from "./commands/update.js";
import { status } from "./commands/status.js";

const program = new Command();

program
  .name("tai")
  .description("TAI — Team AI Infrastructure CLI")
  .version("2.0.0");

program
  .command("init")
  .description("Initialize .tai/ in the current project directory")
  .option("-f, --force", "Overwrite existing .tai/ directory")
  .option("-r, --reconfigure", "Re-run team/project prompts without touching hooks or memory")
  .action(init);

program
  .command("install [package]")
  .description("Install skill/agent packages from packages.yaml")
  .option("-a, --all", "Install all packages (required + recommended + optional)")
  .action(install);

program
  .command("update")
  .description("Update installed packages to latest version")
  .action(update);

program
  .command("status")
  .description("Show installed packages, hooks, and memory stats")
  .action(status);

program.parse();
