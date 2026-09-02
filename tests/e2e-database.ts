export const E2E_DATABASE_URL = "file:./e2e.db";

export function requireDedicatedE2EDatabase(databaseUrl: string) {
  if (databaseUrl !== E2E_DATABASE_URL) {
    throw new Error(
      `Playwright may only reset ${E2E_DATABASE_URL}; refusing ${databaseUrl || "an empty URL"}`,
    );
  }
  return databaseUrl;
}
