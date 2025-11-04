import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type PackageManager = "pnpm" | "npm";

export interface PackageManagerInfo {
  manager: PackageManager;
  command: string;
}

export const COLORS = {
  info: "#38bdf8",
  warn: "#facc15",
  error: "#f87171",
  success: "#34d399",
};

export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const pkgPath = path.join(current, "package.json");
    if (existsSync(pkgPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function commandExists(command: string): boolean {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}

export function detectPackageManager(): PackageManagerInfo | null {
  if (commandExists("pnpm")) {
    return { manager: "pnpm", command: "pnpm" };
  }
  if (commandExists("npm")) {
    return { manager: "npm", command: "npm" };
  }
  return null;
}

export function readPackageManagerFromLock(root: string): PackageManager | null {
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(path.join(root, "package-lock.json"))) {
    return "npm";
  }
  return null;
}

export function parseAppSecret(envPath: string): string | null {
  if (!existsSync(envPath)) return null;
  const content = readFileSync(envPath, "utf8");
  const match = content.match(/^APP_SECRET=(.*)$/m);
  return match ? match[1].trim() : null;
}

export interface RunCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; shell?: boolean } = {}
): RunCommandResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    shell: options.shell ?? false,
    stdio: "pipe",
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
