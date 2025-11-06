import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import crypto from "crypto";
import chalk from "chalk";

const MIN_NODE_VERSION = 18;
const WARN_NODE_MAJOR = 22;

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
  const [majorStr] = process.versions.node.split(".");
  const major = Number(majorStr);

  if (Number.isNaN(major)) {
    logWarn("Unable to determine your Node.js version. Continuing, but things may fail.");
    return;
  }

  if (major < MIN_NODE_VERSION) {
    logError(`Node.js ${MIN_NODE_VERSION}+ is required. Detected ${process.versions.node}.`);
    logInfo("Update Node.js from https://nodejs.org/ then rerun `npm run setup` or `pnpm run setup`.");
    process.exit(1);
  }

  if (major > WARN_NODE_MAJOR) {
    logWarn(`Detected Node.js ${process.versions.node}. Versions above ${WARN_NODE_MAJOR} haven't been fully tested, but we'll keep going.`);
  }
}

function ensureProjectRoot(root: string) {
  if (!existsSync(join(root, "package.json"))) {
    logError("No package.json found. Run this command from the project root (where package.json lives).");
    process.exit(1);
  }
}

function detectPackageManager(): "pnpm" | "npm" {
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
  const envLocalPath = join(root, ".env.local");

  if (!existsSync(envExamplePath)) {
    throw new Error("Missing .env.example. Add one with APP_SECRET and DATABASE_URL before running setup.");
  }

  const secret = crypto.randomBytes(32).toString("hex");

  if (!existsSync(envLocalPath)) {
    const template = readFileSync(envExamplePath, "utf8");
    const updated = applyEnvTemplate(template, secret);
    writeFileSync(envLocalPath, updated);
    logSuccess("Created .env.local from .env.example with a fresh APP_SECRET.");
    return;
  }

  const current = readFileSync(envLocalPath, "utf8");
  const updated = ensureEnvContent(current, secret);

  if (updated !== current) {
    writeFileSync(envLocalPath, updated);
    logSuccess("Updated .env.local with a secure APP_SECRET and default DATABASE_URL.");
  } else {
    logSuccess(".env.local already looks good.");
  }
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
    output = `${output}\nDATABASE_URL=\"file:./prisma/dev.db\"`;
  }

  if (!output.endsWith("\n")) {
    output = `${output}\n`;
  }

  return output;
}

function ensureEnvContent(content: string, secret: string) {
  let output = content.replace(/\r\n/g, "\n");
  const hasSecret = /APP_SECRET=.+/.test(output);
  const needsSecret = /APP_SECRET=\s*$/.test(output) || /APP_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING/.test(output);

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
    output = `${output}DATABASE_URL=\"file:./prisma/dev.db\"`;
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

  runCommand(pkgManager, ["install"], "Installing dependencies");

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
