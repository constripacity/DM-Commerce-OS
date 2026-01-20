#!/usr/bin/env tsx
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type ChalkLike = {
  green: (value: string) => string;
  cyan: (value: string) => string;
  red: (value: string) => string;
};

interface FindingEntry {
  path: string;
  line: number | null;
  matchType: string;
  snippet: string;
  matchText: string;
}

interface ScanReport {
  generatedAt: string;
  findings: FindingEntry[];
}

async function loadChalk(): Promise<ChalkLike> {
  const identity = (value: string) => value;
  try {
    const mod = await import("chalk");
    const instance = (mod as any).default ?? (mod as any);
    const wrap = (method: string) => {
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
  } catch (error) {
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

async function ensureBackup(filePath: string, timestamp: string) {
  const backupRoot = path.join(process.cwd(), ".sanitized-backup", timestamp);
  const target = path.join(backupRoot, filePath);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.copyFile(path.join(process.cwd(), filePath), target);
}

async function redactFile(filePath: string, matches: FindingEntry[], timestamp: string) {
  const fullPath = path.join(process.cwd(), filePath);
  const content = await fsp.readFile(fullPath, "utf8");
  let updated = content;

  for (const finding of matches) {
    const escaped = finding.matchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "g");
    updated = updated.replace(pattern, (segment) => {
      if (segment.includes("=")) {
        return segment.replace(/=(\s*)[^\s]+/, "=$1REDACTED");
      }
      const replacedQuotes = segment.replace(/['\"][^'\"]+['\"]/g, (value) => {
        const quote = value.startsWith("'") ? "'" : '"';
        return `${quote}REDACTED${quote}`;
      });
      if (replacedQuotes !== segment) {
        return replacedQuotes;
      }
      return "REDACTED";
    });
  }

  if (updated !== content) {
    await ensureBackup(filePath, timestamp);
    await fsp.writeFile(fullPath, updated, "utf8");
    return true;
  }

  return false;
}

async function deleteFile(filePath: string, timestamp: string) {
  await ensureBackup(filePath, timestamp);
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

void main();
