import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
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
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_SECRET: "test-secret",
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
