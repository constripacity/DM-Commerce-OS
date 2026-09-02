import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createRedactedTextFinding,
  listGitVisibleFiles,
  loadBinaryDetector,
} from "../../scripts/scanSensitive";
import {
  atomicWritePrivateTextFile,
  writePrivateNewTextFileSync,
} from "../../scripts/utils/private-files";
import { redactFile } from "../../scripts/sanitize";

const execFileAsync = promisify(execFile);

describe("sensitive scanner runtime", () => {
  it("adapts the synchronous binary detector without leaving an unresolved callback promise", async () => {
    const detector = await loadBinaryDetector();
    await expect(detector("fixture.txt", Buffer.from("plain text\n"))).resolves.toBe(false);
    await expect(detector("fixture.bin", Buffer.from([0x00, 0x01, 0x02]))).resolves.toBe(true);
  });

  it("omits ignored local env state but still includes a tracked env file", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "dm-sensitive-scan-"));

    try {
      await execFileAsync("git", ["init", "--quiet"], { cwd: fixtureRoot });
      await writeFile(path.join(fixtureRoot, ".gitignore"), ".env\n*.log\n", "utf8");
      await writeFile(path.join(fixtureRoot, ".env"), "APP_SECRET=local-only\n", "utf8");
      await writeFile(path.join(fixtureRoot, "debug.log"), "ignored artifact\n", "utf8");
      await writeFile(path.join(fixtureRoot, "candidate.txt"), "visible\n", "utf8");

      await expect(listGitVisibleFiles(fixtureRoot)).resolves.toEqual(
        expect.arrayContaining([".gitignore", "candidate.txt"]),
      );
      await expect(listGitVisibleFiles(fixtureRoot)).resolves.not.toContain(".env");
      await expect(listGitVisibleFiles(fixtureRoot)).resolves.not.toContain("debug.log");

      await execFileAsync("git", ["add", "--force", ".env"], { cwd: fixtureRoot });
      await expect(listGitVisibleFiles(fixtureRoot)).resolves.toContain(".env");
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("never places a detected secret value in the finding or its snippet", () => {
    const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const source = `APP_SECRET=${secret}\n`;
    const finding = createRedactedTextFinding({
      path: ".env",
      line: 1,
      matchType: "env-line",
      matchText: `APP_SECRET=${secret}`,
      offset: 0,
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      label: "APP_SECRET",
    });

    expect(finding).toMatchObject({
      snippet: "APP_SECRET=<redacted>",
      redaction: {
        offset: 0,
        length: 75,
      },
    });
    expect(JSON.stringify(finding)).not.toContain(secret);
  });

  // Spawns the scanner CLI as a `node --import tsx` subprocess; that child does
  // not reliably produce its report file under the Node-on-Windows spawn model,
  // so this case is exercised on POSIX CI. The other cases here run everywhere.
  it.skipIf(process.platform === "win32")("fails on a tracked env secret without scanning ignored local state or leaking values", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "dm-sensitive-cli-"));
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const ignoredValue = "ignored-local-value-0123456789abcdef";
    const trackedValue = "tracked-secret-value-0123456789abcdef";

    try {
      await execFileAsync("git", ["init", "--quiet"], { cwd: fixtureRoot });
      await writeFile(path.join(fixtureRoot, ".gitignore"), ".env*\n*.log\n", "utf8");
      await writeFile(
        path.join(fixtureRoot, ".env"),
        `APP_SECRET=${ignoredValue}\n`,
        "utf8",
      );
      await writeFile(path.join(fixtureRoot, "debug.log"), `TOKEN=${ignoredValue}\n`, "utf8");
      await writeFile(
        path.join(fixtureRoot, ".env.production"),
        `APP_SECRET=${trackedValue}\n`,
        "utf8",
      );
      await execFileAsync("git", ["add", "--force", ".env.production"], {
        cwd: fixtureRoot,
      });

      const run = spawnSync(
        process.execPath,
        [
          "--import",
          path.join(repoRoot, "node_modules/tsx/dist/loader.mjs"),
          path.join(repoRoot, "scripts/scanSensitive.ts"),
        ],
        { cwd: fixtureRoot, encoding: "utf8" },
      );
      const reportPath = path.join(fixtureRoot, "scan-report.json");
      const reportText = await readFile(reportPath, "utf8");
      const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
      const report = JSON.parse(reportText) as {
        findings: Array<{ path: string; snippet: string }>;
      };

      expect(run.status).toBe(2);
      expect(output).not.toContain(ignoredValue);
      expect(output).not.toContain(trackedValue);
      expect(reportText).not.toContain(ignoredValue);
      expect(reportText).not.toContain(trackedValue);
      expect(report.findings).toEqual([
        expect.objectContaining({
          path: ".env.production",
          snippet: "APP_SECRET=<redacted>",
        }),
      ]);
      if (process.platform !== "win32") {
        expect((await stat(reportPath)).mode & 0o777).toBe(0o600);
      }
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("creates env and atomically replaced report files with owner-only permissions", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "dm-private-files-"));
    const envPath = path.join(fixtureRoot, ".env");
    const reportPath = path.join(fixtureRoot, "scan-report.json");

    try {
      writePrivateNewTextFileSync(envPath, "APP_SECRET=fixture\n");
      await atomicWritePrivateTextFile(reportPath, "first\n");
      await atomicWritePrivateTextFile(reportPath, "second\n");

      await expect(readFile(reportPath, "utf8")).resolves.toBe("second\n");
      if (process.platform !== "win32") {
        expect((await stat(envPath)).mode & 0o777).toBe(0o600);
        expect((await stat(reportPath)).mode & 0o777).toBe(0o600);
      }
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("redacts by digest-bound location without storing the matched value", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "dm-safe-redaction-"));
    const relativePath = "tracked.env";
    const source = "APP_SECRET=an-actual-secret-value\n";

    try {
      await writeFile(path.join(fixtureRoot, relativePath), source, "utf8");
      const finding = createRedactedTextFinding({
        path: relativePath,
        line: 1,
        matchType: "env-line",
        matchText: source.trim(),
        offset: 0,
        sourceSha256: createHash("sha256").update(source).digest("hex"),
        label: "APP_SECRET",
      });

      await expect(
        redactFile(relativePath, [finding], "test-backup", fixtureRoot),
      ).resolves.toBe(true);
      await expect(readFile(path.join(fixtureRoot, relativePath), "utf8")).resolves.toBe(
        "APP_SECRET=REDACTED\n",
      );
      expect(JSON.stringify(finding)).not.toContain("an-actual-secret-value");
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});
