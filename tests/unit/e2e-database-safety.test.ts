import { describe, expect, it } from "vitest";
import {
  E2E_DATABASE_URL,
  requireDedicatedE2EDatabase,
} from "../e2e-database";

describe("Playwright database isolation", () => {
  it("uses only the dedicated E2E database and refuses the developer database", () => {
    expect(requireDedicatedE2EDatabase(E2E_DATABASE_URL)).toBe("file:./e2e.db");
    expect(() => requireDedicatedE2EDatabase("file:./dev.db")).toThrow(
      "Playwright may only reset",
    );
    expect(() => requireDedicatedE2EDatabase("")).toThrow();
  });
});
