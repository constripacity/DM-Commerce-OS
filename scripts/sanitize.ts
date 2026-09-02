#!/usr/bin/env tsx
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { stdin as input, stdout as output } from "node:process";

type ChalkLike = {
  green: (value: string) => string;
  cyan: (value: string) => string;
  red: (value: string) => string;
};

export interface FindingEntry {
  path: string;
  line: number | null;
  matchType: string;
  snippet: string;
  redaction?: {
    offset: number;
    length: number;
    sourceSha256: string;
  };
}

interface ScanReport {
  generatedAt: string;
  findings: FindingEntry[];
}

async function loadChalk(): Promise<ChalkLike> {
  const identity = (value: string) => value;
  try {
    const mod = await import("chalk");
    const instance = mod.default;
    const wrap = (method: keyof ChalkLike) => {
      const fn = instance?.[method];
      if (typeof fn === "function") {
        return fn.bind(instance);
      }
      if (typeof instance === "function") {
        return instance;
      }
      return identity;
    };
    return {
      green: wrap("green"),
      cyan: wrap("cyan"),
      red: wrap("red"),
    };
  } catch {
    return { green: identity, cyan: identity, red: identity };
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    delete: false,
    redact: false,
    interactive: false,
  };

  for (const arg of args) {
    if (arg === "--delete") {
      options.delete = true;
    } else if (arg === "--redact") {
      options.redact = true;
    } else if (arg === "--interactive") {
      options.interactive = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function isProtectedPath(filePath: string) {
  return (
    filePath.startsWith("public/files/") ||
    filePath.endsWith(".env.example") ||
    filePath.startsWith("src/") ||
    filePath.startsWith("app/")
  );
}

async function ensureBackup(filePath: string, timestamp: string, root: string) {
  const backupRoot = path.join(root, ".sanitized-backup", timestamp);
  const target = path.join(backupRoot, filePath);
  await fsp.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") {
    await fsp.chmod(backupRoot, 0o700);
    await fsp.chmod(path.dirname(target), 0o700);
  }
  await fsp.copyFile(path.join(root, filePath), target);
  if (process.platform !== "win32") {
    await fsp.chmod(target, 0o600);
  }
}

export async function redactFile(
  filePath: string,
  matches: FindingEntry[],
  timestamp: string,
  root: string = process.cwd(),
) {
  const fullPath = path.join(root, filePath);
  const source = await fsp.readFile(fullPath);
  const content = source.toString("utf8");
  const sourceSha256 = createHash("sha256").update(source).digest("hex");
  let updated = content;

  const spans = matches.flatMap((finding) => {
    const location = finding.redaction;
    if (!location) return [];
    return [{ ...location, matchType: finding.matchType }];
  });

  if (spans.length === 0) {
    return false;
  }

  for (const span of spans) {
    if (span.sourceSha256 !== sourceSha256) {
      throw new Error(`${filePath} changed after the scan; rerun scan:sensitive before redacting.`);
    }
    if (
      !Number.isSafeInteger(span.offset) ||
      !Number.isSafeInteger(span.length) ||
      span.offset < 0 ||
      span.length < 1 ||
      span.offset + span.length > content.length
    ) {
      throw new Error(`Invalid redaction span for ${filePath}; rerun scan:sensitive.`);
    }
  }

  const uniqueSpans = Array.from(
    new Map(spans.map((span) => [`${span.offset}:${span.length}`, span])).values(),
  ).sort((a, b) => a.offset - b.offset);

  for (let index = 1; index < uniqueSpans.length; index += 1) {
    const previous = uniqueSpans[index - 1];
    const current = uniqueSpans[index];
    if (current.offset < previous.offset + previous.length) {
      throw new Error(`Overlapping redaction spans for ${filePath}; review the report manually.`);
    }
  }

  for (const span of uniqueSpans.reverse()) {
    const segment = updated.slice(span.offset, span.offset + span.length);
    let replacement = "REDACTED";
    if (span.matchType === "env-line" && segment.includes("=")) {
      replacement = `${segment.slice(0, segment.indexOf("=") + 1)}REDACTED`;
    } else if (span.matchType === "api-key") {
      const quoted = segment.replace(/(['"])[^'"]+\1/g, "$1REDACTED$1");
      replacement = quoted === segment ? "REDACTED" : quoted;
    }
    updated = `${updated.slice(0, span.offset)}${replacement}${updated.slice(span.offset + span.length)}`;
  }

  if (updated !== content) {
    await ensureBackup(filePath, timestamp, root);
    await fsp.writeFile(fullPath, updated, "utf8");
    return true;
  }

  return false;
}

async function deleteFile(filePath: string, timestamp: string) {
  await ensureBackup(filePath, timestamp, process.cwd());
  await fsp.unlink(path.join(process.cwd(), filePath));
}

async function main() {
  const chalk = await loadChalk();
  try {
    const options = parseArgs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(process.cwd(), "scan-report.json");

    if (!fs.existsSync(reportPath)) {
      throw new Error("scan-report.json not found. Run scan:sensitive first.");
    }

    const raw = await fsp.readFile(reportPath, "utf8");
    const report = JSON.parse(raw) as ScanReport;

    if (!report.findings.length) {
      console.log(chalk.green("No findings to sanitize."));
      return;
    }

    const grouped = report.findings.reduce<Record<string, FindingEntry[]>>((acc, finding) => {
      acc[finding.path] = acc[finding.path] ?? [];
      acc[finding.path].push(finding);
      return acc;
    }, {});

    const rl = options.interactive ? readline.createInterface({ input, output }) : undefined;

    let deleted = 0;
    let redacted = 0;
    let skipped = 0;

    for (const [filePath, matches] of Object.entries(grouped)) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        skipped += 1;
        continue;
      }

      let allowAction = true;
      if (options.interactive && rl) {
        const answer = await rl.question(`Process ${filePath}? (y/N) `);
        allowAction = /^y(es)?$/i.test(answer.trim());
      }
      if (!allowAction) {
        skipped += 1;
        continue;
      }

      if (options.delete && !isProtectedPath(filePath)) {
        await deleteFile(filePath, timestamp);
        deleted += 1;
        continue;
      }

      if (options.redact) {
        const changed = await redactFile(filePath, matches, timestamp);
        if (changed) {
          redacted += 1;
        } else {
          skipped += 1;
        }
      } else {
        skipped += 1;
      }
    }

    if (rl) {
      await rl.close();
    }

    console.log(chalk.cyan(`Sanitization complete. Deleted ${deleted}, redacted ${redacted}, skipped ${skipped}.`));
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  void main();
}
