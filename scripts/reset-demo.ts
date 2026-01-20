#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import { existsSync, rmSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { detectPackageManager, findProjectRoot } from "./utils/env";

async function runStep(command: string, args: string[], label: string, cwd: string) {
  const spinner = ora({ text: label, color: "cyan" }).start();
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (error) => {
      spinner.fail(`${label} (failed)`);
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        spinner.succeed(label);
        resolve();
      } else {
        spinner.fail(`${label} (exit code ${code ?? "unknown"})`);
        reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`));
      }
    });
  });
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<boolean>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

async function main() {
  const root = findProjectRoot();
  if (!root) {
    console.error(chalk.red("Please run this command from inside the DM-Commerce-OS project."));
    process.exit(1);
  }

  const pm = detectPackageManager();
  if (!pm) {
    console.error(chalk.red("Neither pnpm nor npm was found in your PATH."));
    process.exit(1);
  }

  if (process.cwd() !== root) {
    process.chdir(root);
  }

  if (pm.manager === "pnpm") {
    await runStep(
      "pnpm",
      ["prisma", "migrate", "reset", "--force", "--skip-generate"],
      "Resetting Prisma database",
      root
    );
  } else {
    await runStep(
      "npm",
      ["exec", "prisma", "migrate", "reset", "--force", "--skip-generate"],
      "Resetting Prisma database",
      root
    );
  }

  if (pm.manager === "pnpm") {
    await runStep("pnpm", ["prisma", "generate"], "Regenerating Prisma client", root);
  } else {
    await runStep("npm", ["exec", "prisma", "generate"], "Regenerating Prisma client", root);
  }

  if (pm.manager === "pnpm") {
    await runStep("pnpm", ["db:seed"], "Seeding demo data", root);
  } else {
    await runStep("npm", ["run", "db:seed"], "Seeding demo data", root);
  }

  const dbPath = path.join(root, "prisma", "dev.db");
  if (existsSync(dbPath)) {
    const shouldDelete = await promptYesNo("Delete the local prisma/dev.db file as well? (y/N) ");
    if (shouldDelete) {
      rmSync(dbPath, { force: true });
      console.log(chalk.yellow("Deleted prisma/dev.db"));
    }
  }

  console.log();
  console.log(chalk.green("Demo data refreshed!"));
  console.log(chalk.cyan("Use pnpm dev (or npm run dev) and log in with demo@local.test / demo123"));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });
}
