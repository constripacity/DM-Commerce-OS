#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
import {
  detectPackageManager,
  findProjectRoot,
  commandExists,
  parseAppSecret,
  PackageManagerInfo,
} from "./utils/env";

interface DoctorOptions {
  silent?: boolean;
}

export interface DoctorResult {
  ok: boolean;
  rootDir: string;
  osName: string;
  shellName: string;
  nodeVersion: string;
  packageManager: PackageManagerInfo | null;
  warnings: string[];
  errors: string[];
  notes: string[];
  port: number;
  isGitRepo: boolean;
}

const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_NODE_MINOR = 19;
const DEFAULT_PORT = 3000;
const APP_SECRET_PLACEHOLDER = "CHANGE_ME_TO_A_LONG_RANDOM_STRING";

function formatPlatform(): string {
  const platform = os.platform();
  switch (platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return platform;
  }
}

async function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => {
      try {
        server.close();
      } catch {
        // ignore
      }
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const root = findProjectRoot();
  const errors: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  if (!root) {
    errors.push("Unable to locate package.json. Please run this command from the project directory.");
    const result: DoctorResult = {
      ok: false,
      rootDir: process.cwd(),
      osName: formatPlatform(),
      shellName: process.env.SHELL ?? process.env.ComSpec ?? "unknown",
      nodeVersion: process.version,
      packageManager: null,
      warnings,
      errors,
      notes: [],
      port: DEFAULT_PORT,
      isGitRepo: false,
    };
    if (!options.silent) {
      errors.forEach((message) => console.error(chalk.red(`✖ ${message}`)));
    }
    return result;
  }

  const spinner = options.silent
    ? null
    : ora({ text: "Running preflight checks...", color: "cyan" }).start();

  const previousCwd = process.cwd();

  try {
    process.chdir(root);

    const osName = formatPlatform();
    const shellName = process.env.SHELL ?? process.env.ComSpec ?? "unknown";
    const nodeVersion = process.version;
    const [nodeMajor, nodeMinor] = nodeVersion
      .replace("v", "")
      .split(".")
      .slice(0, 2)
      .map((part) => parseInt(part, 10));
    const nodeSupported =
      !Number.isNaN(nodeMajor) &&
      !Number.isNaN(nodeMinor) &&
      ((nodeMajor === REQUIRED_NODE_MAJOR && nodeMinor >= REQUIRED_NODE_MINOR) ||
        (nodeMajor === 22 && nodeMinor >= 13) ||
        nodeMajor >= 24);
    if (!nodeSupported) {
      errors.push(
        `Use Node.js 20.19+, 22.13+, or 24+. You have ${nodeVersion}. Download an active LTS release from https://nodejs.org/.`
      );
    }

    const pkgManager = detectPackageManager();
    if (!pkgManager) {
      errors.push("Neither pnpm nor npm was found in your PATH. Install one of them and retry.");
    }

    const gitAvailable = commandExists("git");
    if (!gitAvailable) {
      warnings.push("Git was not found. That's OK if you downloaded the ZIP.");
    }

    const opensslAvailable = commandExists("openssl", ["version"]);
    if (!opensslAvailable) {
      warnings.push("OpenSSL not detected. We'll fall back to Node's crypto for secrets.");
    }

    const appSecret = parseAppSecret(path.join(root, ".env"));
    if (appSecret === APP_SECRET_PLACEHOLDER) {
      errors.push("APP_SECRET is still the public .env.example placeholder. Run `npm run setup` or replace it.");
    } else if (appSecret && appSecret.length < 32) {
      errors.push("APP_SECRET must contain at least 32 characters.");
    }

    const portFree = await checkPortAvailability(DEFAULT_PORT);
    if (!portFree) {
      warnings.push(
        `Port ${DEFAULT_PORT} looks busy. The setup scripts can switch to port 3001 automatically.`
      );
    }

    const gitFolderExists = existsSync(path.join(root, ".git"));
    const isGitRepo = gitFolderExists;
    if (!gitFolderExists) {
      notes.push("No .git folder detected. Looks like a ZIP install — totally fine!");
    }

    const result: DoctorResult = {
      ok: errors.length === 0,
      rootDir: root,
      osName,
      shellName,
      nodeVersion,
      packageManager: pkgManager,
      warnings,
      errors,
      notes,
      port: portFree ? DEFAULT_PORT : DEFAULT_PORT + 1,
      isGitRepo,
    };

    if (!options.silent) {
      spinner?.succeed("Preflight complete!");
      console.log();
      console.log(
        `${chalk.bold("OS")}: ${osName}  ${chalk.bold("Shell")}: ${shellName}  ${chalk.bold(
          "Node"
        )}: ${nodeVersion}`
      );
      if (pkgManager) {
        console.log(`${chalk.bold("Package manager")}: ${pkgManager.manager}`);
      }
      if (warnings.length > 0) {
        console.log();
        warnings.forEach((message) => console.log(chalk.yellow(`⚠ ${message}`)));
      }
      if (notes.length > 0) {
        console.log();
        notes.forEach((message) => console.log(chalk.cyan(`ℹ ${message}`)));
      }
      if (errors.length > 0) {
        console.log();
        errors.forEach((message) => console.error(chalk.red(`✖ ${message}`)));
      } else {
        console.log();
        console.log(chalk.green("You're good to go!"));
      }
    }

    return result;
  } catch (error) {
    spinner?.fail("Doctor check failed");
    throw error;
  } finally {
    process.chdir(previousCwd);
  }
}

async function runCli() {
  const result = await runDoctor();
  if (!result.ok) {
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli().catch((error) => {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });
}
