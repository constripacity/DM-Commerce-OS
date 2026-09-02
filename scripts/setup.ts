import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import crypto from "crypto";
import chalk from "chalk";
import {
  restrictFileToOwnerSync,
  writePrivateNewTextFileSync,
} from "./utils/private-files";

const DEFAULT_DATABASE_URL = "file:./dev.db";

function logInfo(message: string) {
  console.log(chalk.cyan(`\n➡️  ${message}`));
}

function logSuccess(message: string) {
  console.log(chalk.green(`✅ ${message}`));
}

function logWarn(message: string) {
  console.log(chalk.yellow(`⚠️  ${message}`));
}

function logError(message: string) {
  console.error(chalk.red(`✖ ${message}`));
}

function ensureNodeVersion() {
  const [majorStr, minorStr] = process.versions.node.split(".");
  const major = Number(majorStr);
  const minor = Number(minorStr);

  if (Number.isNaN(major) || Number.isNaN(minor)) {
    logWarn("Unable to determine your Node.js version. Continuing, but things may fail.");
    return;
  }

  const supported =
    (major === 20 && minor >= 19) ||
    (major === 22 && minor >= 13) ||
    major >= 24;
  if (!supported) {
    logError(`Use Node.js 20.19+, 22.13+, or 24+. Detected ${process.versions.node}.`);
    logInfo("Update Node.js from https://nodejs.org/ then rerun `npm run setup`.");
    process.exit(1);
  }

}

function ensureProjectRoot(root: string) {
  if (!existsSync(join(root, "package.json"))) {
    logError("No package.json found. Run this command from the project root (where package.json lives).");
    process.exit(1);
  }
}

function detectPackageManager(): "pnpm" | "npm" {
  if (existsSync(join(process.cwd(), "package-lock.json"))) {
    return "npm";
  }
  if (existsSync(join(process.cwd(), "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  const result = spawnSync("pnpm", ["--version"], { stdio: "ignore" });
  if (result.status === 0) {
    return "pnpm";
  }
  return "npm";
}

function runCommand(command: string, args: string[], description: string) {
  logInfo(description);
  const child = spawnSync(command, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: process.platform === "win32",
  });

  if (child.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function ensureEnvFile(root: string) {
  const envExamplePath = join(root, ".env.example");
  const envPath = join(root, ".env");

  if (!existsSync(envExamplePath)) {
    throw new Error("Missing .env.example. Add one with APP_SECRET and DATABASE_URL before running setup.");
  }

  const secret = crypto.randomBytes(32).toString("hex");

  if (!existsSync(envPath)) {
    const template = readFileSync(envExamplePath, "utf8");
    const updated = applyEnvTemplate(template, secret);
    writePrivateNewTextFileSync(envPath, updated);
    logSuccess("Created .env from .env.example with a fresh APP_SECRET.");
    return;
  }

  const current = readFileSync(envPath, "utf8");
  const updated = ensureEnvContent(current, secret);

  if (updated !== current) {
    writeFileSync(envPath, updated);
    logSuccess("Updated .env with a secure APP_SECRET and local DATABASE_URL.");
  } else {
    logSuccess(".env already looks good.");
  }

  restrictFileToOwnerSync(envPath);
}

function applyEnvTemplate(template: string, secret: string) {
  const normalized = template.replace(/\r\n/g, "\n");
  let output = normalized;

  if (/APP_SECRET=.*/.test(output)) {
    output = output.replace(/APP_SECRET=.*/g, `APP_SECRET=${secret}`);
  } else {
    output = `${output}\nAPP_SECRET=${secret}`;
  }

  if (!/DATABASE_URL=/.test(output)) {
    output = `${output}\nDATABASE_URL="${DEFAULT_DATABASE_URL}"`;
  }

  if (!/CHECKPOINT_DISABLE=/.test(output)) {
    output = `${output}\nCHECKPOINT_DISABLE=1`;
  }

  if (!output.endsWith("\n")) {
    output = `${output}\n`;
  }

  return output;
}

function ensureEnvContent(content: string, secret: string) {
  let output = content.replace(/\r\n/g, "\n");
  const hasSecret = /APP_SECRET=.+/.test(output);
  const needsSecret =
    /APP_SECRET=\s*$/.test(output) ||
    /APP_SECRET=(?:CHANGE_ME_TO_A_LONG_RANDOM_STRING|GENERATE_AT_INSTALL)/.test(output);

  if (!hasSecret || needsSecret) {
    if (hasSecret) {
      output = output.replace(/APP_SECRET=.*/g, `APP_SECRET=${secret}`);
    } else {
      output = `${output}\nAPP_SECRET=${secret}`;
    }
  }

  if (!/DATABASE_URL=/.test(output)) {
    if (!output.endsWith("\n")) {
      output = `${output}\n`;
    }
    output = `${output}DATABASE_URL="${DEFAULT_DATABASE_URL}"`;
  } else if (/DATABASE_URL=["']?postgres(?:ql)?:\/\/user:password@localhost:5432\/dm_?commerce(?:\?schema=public)?["']?/.test(output)) {
    output = output.replace(
      /DATABASE_URL=["']?postgres(?:ql)?:\/\/user:password@localhost:5432\/dm_?commerce(?:\?schema=public)?["']?/,
      `DATABASE_URL="${DEFAULT_DATABASE_URL}"`,
    );
  }

  if (!/CHECKPOINT_DISABLE=/.test(output)) {
    if (!output.endsWith("\n")) {
      output = `${output}\n`;
    }
    output = `${output}CHECKPOINT_DISABLE=1`;
  }

  if (!output.endsWith("\n")) {
    output = `${output}\n`;
  }

  return output;
}

function ensureMigrationsDir(root: string) {
  const migrationsDir = join(root, "prisma", "migrations");
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
    return [] as string[];
  }
  return readdirSync(migrationsDir).filter((item) => !item.startsWith("."));
}

async function main() {
  console.log(chalk.bold("DM Commerce OS — Guided setup"));
  ensureNodeVersion();

  const root = process.cwd();
  ensureProjectRoot(root);

  const pkgManager = detectPackageManager();
  logSuccess(`Using ${pkgManager} for dependency management.`);

  ensureEnvFile(root);

  if (!process.argv.includes("--skip-install")) {
    const installArgs = pkgManager === "npm" && existsSync(join(root, "package-lock.json"))
      ? ["ci"]
      : ["install"];
    runCommand(pkgManager, installArgs, "Installing dependencies");
  } else {
    logSuccess("Dependencies installed from the committed npm lockfile.");
  }

  const prismaArgsGenerate = pkgManager === "pnpm" ? ["prisma", "generate"] : ["exec", "prisma", "generate"];
  runCommand(pkgManager, prismaArgsGenerate, "Generating Prisma client");

  const existingMigrations = ensureMigrationsDir(root);
  if (existingMigrations.length === 0) {
    const migrateArgs = pkgManager === "pnpm"
      ? ["prisma", "migrate", "dev", "--name", "init", "--create-only"]
      : ["exec", "prisma", "migrate", "dev", "--name", "init", "--create-only"];
    runCommand(pkgManager, migrateArgs, "Creating initial Prisma migration (init)");
  }

  const migrateApplyArgs = pkgManager === "pnpm"
    ? ["prisma", "migrate", "deploy"]
    : ["exec", "prisma", "migrate", "deploy"];
  runCommand(pkgManager, migrateApplyArgs, "Applying Prisma migrations");

  const seedArgs = pkgManager === "pnpm" ? ["db:seed"] : ["run", "db:seed"];
  runCommand(pkgManager, seedArgs, "Seeding demo data");

  logSuccess("Setup complete.");
  const devCommand = pkgManager === "pnpm" ? "pnpm dev" : "npm run dev";
  console.log(
    chalk.blueBright(
      `\nNext steps:\n  1. ${devCommand}\n  2. Open http://localhost:3000/login\n  3. Sign in with demo@local.test / demo123`
    )
  );
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
