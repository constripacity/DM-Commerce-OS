import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("browser cache safety", () => {
  it("ships only legacy-worker cleanup and never intercepts private or dynamic requests", () => {
    const worker = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
    const provider = readFileSync(
      path.join(process.cwd(), "src", "components", "pwa-provider.tsx"),
      "utf8",
    );

    expect(worker).not.toContain('addEventListener("fetch"');
    expect(worker).not.toContain("respondWith");
    expect(worker).toContain("registration.unregister()");
    expect(provider).not.toContain("serviceWorker.register");
    expect(provider).toContain("getRegistrations");
    expect(provider).toContain("dm-commerce-os-cache-");
  });
});
