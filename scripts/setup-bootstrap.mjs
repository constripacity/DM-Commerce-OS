import { spawnSync } from "node:child_process";

const [major, minor] = process.versions.node.split(".").map(Number);
const supported =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 13) ||
  major >= 24;

if (!supported) {
  console.error(
    `Use Node.js 20.19+, 22.13+, or 24+. Detected ${process.versions.node}.`,
  );
  process.exit(1);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

try {
  console.log("Installing locked dependencies...");
  run("npm", ["ci", "--no-audit", "--no-fund"], {
    ...process.env,
    CHECKPOINT_DISABLE: "1",
    PRISMA_SKIP_POSTINSTALL_GENERATE: "true",
  });
  run(process.execPath, ["--import", "tsx", "scripts/setup.ts", "--skip-install"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
