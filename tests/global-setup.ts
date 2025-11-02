import { execSync } from "child_process";

async function globalSetup() {
  execSync("npm run demo:reset", { stdio: "inherit" });
}

export default globalSetup;
