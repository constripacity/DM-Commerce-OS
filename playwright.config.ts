import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL, requireDedicatedE2EDatabase } from "./tests/e2e-database";

const e2eDatabaseUrl = requireDedicatedE2EDatabase(E2E_DATABASE_URL);

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 90_000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_SECRET: "playwright-secret-that-is-at-least-thirty-two-characters",
      DATABASE_URL: e2eDatabaseUrl,
      CHECKPOINT_DISABLE: "1",
    },
  },
  globalSetup: "./tests/global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
