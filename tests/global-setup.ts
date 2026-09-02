import { execFileSync } from "child_process";
import path from "node:path";
import { E2E_DATABASE_URL, requireDedicatedE2EDatabase } from "./e2e-database";

async function globalSetup() {
  const prismaBinary = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma",
  );
  const env = {
    ...process.env,
    DATABASE_URL: requireDedicatedE2EDatabase(E2E_DATABASE_URL),
    CHECKPOINT_DISABLE: "1",
  };
  execFileSync(prismaBinary, ["migrate", "reset", "--force", "--skip-generate"], {
    stdio: "inherit",
    env,
  });
  execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
    stdio: "inherit",
    env,
  });
}

export default globalSetup;
