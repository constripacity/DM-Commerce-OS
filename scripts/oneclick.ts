#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
import { findProjectRoot } from "./utils/env";
import { runDoctor } from "./doctor";

async function main() {
  const root = findProjectRoot();
  if (!root) {
    console.error(chalk.red("Could not find package.json. Run this command from the project root."));
    process.exit(1);
  }

  if (process.cwd() !== root) {
    console.log(chalk.gray(`Switching to project root: ${root}`));
    process.chdir(root);
  }

  const doctorResult = await runDoctor();
  if (!doctorResult.ok || !doctorResult.packageManager) {
    console.error(chalk.red("Fix the issues above and rerun the one-click setup."));
    process.exit(1);
  }

  const isWindows = os.platform() === "win32";
  const scriptName = isWindows ? "setup:win" : "setup:unix";
  const pm = doctorResult.packageManager.manager;
  const command = pm;
  const args = ["run", scriptName];

  const spinner = ora({ text: `Running ${command} ${args.join(" ")}`, color: "cyan" }).start();

  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: os.platform() === "win32",
  });

  child.once("spawn", () => {
    spinner.succeed(`Running ${command} ${args.join(" ")}`);
    console.log(chalk.cyan(`> ${command} ${args.join(" ")}`));
  });

  child.once("error", (error) => {
    spinner.fail("Failed to launch the platform-specific bootstrap script.");
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });

  console.log(
    chalk.gray(
      `If you prefer manual control, run ${
        isWindows
          ? "powershell -ExecutionPolicy Bypass -File ./scripts/bootstrap.ps1"
          : "bash ./scripts/bootstrap.sh"
      }`
    )
  );

  child.on("exit", (code) => {
    if (code === 0) {
      console.log(
        chalk.green(
          `All done! The app should now be running at http://localhost:${doctorResult.port}/login.`
        )
      );
    } else {
      console.error(chalk.red(`The setup script exited with code ${code ?? "unknown"}.`));
    }
    process.exit(code === null ? 1 : code);
  });
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });
}
