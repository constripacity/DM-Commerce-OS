import { execSync } from "child_process";

async function globalSetup() {
  const userAgent = process.env.npm_config_user_agent ?? "";
  const packageManager = userAgent.startsWith("pnpm") ? "pnpm" : "npm";
  const execBinary = packageManager === "pnpm" ? "pnpm" : "npx";

  execSync(`${execBinary} prisma migrate reset --force --skip-generate`, { stdio: "inherit" });
  execSync(`${packageManager} run db:seed`, { stdio: "inherit" });
}

export default globalSetup;
