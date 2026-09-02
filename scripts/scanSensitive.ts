#!/usr/bin/env tsx
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { atomicWritePrivateTextFile } from "./utils/private-files";

type Finding = {
  path: string;
  line: number | null;
  matchType: string;
  snippet: string;
  redaction?: {
    offset: number;
    length: number;
    sourceSha256: string;
  };
};

type Config = {
  ignorePaths: string[];
  allowEmails: string[];
  allowMatches: string[];
  treatAsBinary: string[];
  expectedBinary?: string[];
  maxFileBytes: number;
};

type Detector = {
  type: string;
  regex: RegExp;
  skipFile?: (filePath: string) => boolean;
  transform?: (match: RegExpExecArray) => string;
};

type CliOptions = {
  outputJson: boolean;
  failOnFindings: boolean;
  customPattern?: RegExp;
};

type ChalkLike = {
  bold: (value: string) => string;
  green: (value: string) => string;
  cyan: (value: string) => string;
  red: (value: string) => string;
};

type TableFormatter = (rows: string[][]) => string;

type Matcher = (value: string) => boolean;

type BinaryDetector = (filePath: string, buffer: Buffer) => Promise<boolean>;

const execFileAsync = promisify(execFile);

const DEFAULT_CONFIG: Config = {
  ignorePaths: ["node_modules/**", ".next/**", ".git/**", "tmp/**", "var/**", "public/screenshots/**", "prisma/dev.db"],
  allowEmails: ["demo@local.test"],
  allowMatches: [],
  treatAsBinary: ["**/*.pdf", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.webp"],
  expectedBinary: ["public/files/**"],
  maxFileBytes: 5 * 1024 * 1024,
};

const detectors: Detector[] = [
  { type: "private-key", regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/g },
  { type: "jwt-token", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  {
    type: "api-key",
    regex: /(api[_-]?key|secret|token|password|pwd)\s*[:=]\s*['"][A-Za-z0-9_\-\/.+]{16,}['"]/gi,
  },
  {
    type: "env-line",
    regex: /^([A-Z0-9_]{2,})=(.+)$/gm,
    skipFile: (filePath) => {
      const basename = path.basename(filePath);
      return basename === ".env.example" || !basename.startsWith(".env");
    },
  },
  { type: "email", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
];

const csvHeaders = ["name", "email", "phone", "address"];

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let outputJson = false;
  let failOnFindings = true;
  let customPattern: RegExp | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      outputJson = true;
    } else if (arg === "--no-fail") {
      failOnFindings = false;
    } else if (arg === "--pattern") {
      const pattern = args[i + 1];
      if (!pattern) throw new Error("--pattern requires a value");
      customPattern = new RegExp(pattern, "g");
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { outputJson, failOnFindings, customPattern };
}

async function readConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), ".sensitiverc.json");
  try {
    const raw = await fsp.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      ignorePaths: parsed.ignorePaths ?? DEFAULT_CONFIG.ignorePaths,
      allowEmails: parsed.allowEmails ?? DEFAULT_CONFIG.allowEmails,
      allowMatches: parsed.allowMatches ?? DEFAULT_CONFIG.allowMatches,
      treatAsBinary: parsed.treatAsBinary ?? DEFAULT_CONFIG.treatAsBinary,
      expectedBinary: parsed.expectedBinary ?? DEFAULT_CONFIG.expectedBinary,
      maxFileBytes: parsed.maxFileBytes ?? DEFAULT_CONFIG.maxFileBytes,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function redactDetectedValue(matchType: string, label?: string) {
  const safeLabel = label?.match(/^[A-Za-z0-9_-]{1,64}$/)?.[0];
  const redacted = safeLabel
    ? `${safeLabel}=<redacted>`
    : `<redacted-${matchType.replace(/[^a-z0-9-]/gi, "-")}>`;

  return redacted;
}

export function createRedactedTextFinding(input: {
  path: string;
  line: number;
  matchType: string;
  matchText: string;
  offset: number;
  sourceSha256: string;
  label?: string;
}): Finding {
  return {
    path: input.path,
    line: input.line,
    matchType: input.matchType,
    snippet: redactDetectedValue(input.matchType, input.label),
    redaction: {
      offset: input.offset,
      length: input.matchText.length,
      sourceSha256: input.sourceSha256,
    },
  };
}

function shouldAllowEmail(value: string, allowList: string[]) {
  const normalized = value.toLowerCase();
  const domain = normalized.split("@")[1];
  return (
    allowList.some((allowed) => allowed.toLowerCase() === normalized) ||
    domain === "example.com" ||
    domain === "example.test" ||
    domain === "local.test"
  );
}

async function hashFile(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function escapeRegexChar(char: string) {
  return /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
}

function globToRegExp(pattern: string) {
  let regex = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "*") {
      const next = pattern[i + 1];
      if (next === "*") {
        regex += ".*";
        i += 1;
      } else {
        regex += "[^/]*";
      }
    } else if (char === "?") {
      regex += ".";
    } else {
      regex += escapeRegexChar(char);
    }
  }
  return new RegExp(`^${regex}$`);
}

async function loadChalk(): Promise<ChalkLike> {
  const identity = (value: string) => value;
  try {
    const mod = await import("chalk");
    const chalkInstance = mod.default;
    const wrap = (method: keyof ChalkLike) => {
      const fn = chalkInstance?.[method];
      if (typeof fn === "function") {
        return fn.bind(chalkInstance);
      }
      if (typeof chalkInstance === "function") {
        return chalkInstance;
      }
      return identity;
    };
    return {
      bold: wrap("bold"),
      green: wrap("green"),
      cyan: wrap("cyan"),
      red: wrap("red"),
    };
  } catch {
    return { bold: identity, green: identity, cyan: identity, red: identity };
  }
}

async function loadTable(): Promise<TableFormatter> {
  try {
    const mod = await import("table");
    const tableFn = mod.table;
    if (typeof tableFn === "function") {
      return (rows: string[][]) =>
        tableFn(rows, {
          border: {
            topBody: "",
            topJoin: "",
            topLeft: "",
            topRight: "",
            bottomBody: "",
            bottomJoin: "",
            bottomLeft: "",
            bottomRight: "",
            bodyLeft: "",
            bodyRight: "",
            bodyJoin: "  ",
            joinBody: "",
            joinLeft: "",
            joinRight: "",
            joinJoin: "",
          },
          drawHorizontalLine: () => false,
        });
    }
  } catch {
    // fall through to fallback
  }
  return (rows: string[][]) => rows.map((row) => row.join("  ")).join("\n");
}

async function loadPicomatch(): Promise<(pattern: string) => Matcher> {
  try {
    const mod = await import("picomatch");
    const factory = mod.default;
    if (typeof factory === "function") {
      return (pattern: string) => {
        const matcher = factory(pattern, { dot: true });
        return (value: string) => Boolean(matcher(value));
      };
    }
  } catch {
    // use fallback implementation below
  }
  return (pattern: string) => {
    const regex = globToRegExp(pattern);
    return (value: string) => regex.test(value);
  };
}

export async function listGitVisibleFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      },
    );

    return String(stdout)
      .split("\0")
      .filter(Boolean)
      .map((entry) => entry.split(path.sep).join("/"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Sensitive scan requires a Git working tree so ignored local files stay private: ${detail}`,
    );
  }
}

async function collectScanEntries(
  cwd: string,
  config: Config,
  createMatcher: (pattern: string) => Matcher,
) {
  const gitVisibleFiles = await listGitVisibleFiles(cwd);
  const ignoreMatchers = buildMatchers(config.ignorePaths, createMatcher);
  return gitVisibleFiles.filter((entry) => !matchesAny(ignoreMatchers, entry));
}

export async function loadBinaryDetector(): Promise<BinaryDetector> {
  try {
    const mod = await import("istextorbinary");
    const isBinary = mod.isBinary;
    if (typeof isBinary === "function") {
      const synchronousDetector = isBinary as unknown as (
        filePath: string,
        buffer: Buffer,
      ) => boolean;
      return async (filePath: string, buffer: Buffer) =>
        Boolean(synchronousDetector(filePath, buffer));
    }
  } catch {
    // fallback below
  }
  return async (_filePath: string, buffer: Buffer) => {
    const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
    for (const byte of sample) {
      if (byte === 0) return true;
    }
    return false;
  };
}

function buildMatchers(patterns: string[], factory: (pattern: string) => Matcher) {
  return patterns.map((pattern) => factory(pattern));
}

function matchesAny(matchers: Matcher[], value: string) {
  return matchers.some((matcher) => matcher(value));
}

async function scanFile(
  relativePath: string,
  fullPath: string,
  stats: fs.Stats,
  config: Config,
  options: CliOptions,
  binaryDetector: BinaryDetector,
  treatAsBinaryMatchers: Matcher[],
  expectedBinaryMatchers: Matcher[],
): Promise<Finding[]> {
  const findings: Finding[] = [];

  if (stats.size > config.maxFileBytes) {
    const signature = await hashFile(fullPath);
    findings.push({
      path: relativePath,
      line: null,
      matchType: "large-file",
      snippet: `size=${stats.size} signature=${signature.slice(0, 16)}...`,
    });
    return findings;
  }

  const buffer = await fsp.readFile(fullPath);
  const treatAsBinary = matchesAny(treatAsBinaryMatchers, relativePath);
  const binaryByDetector = await binaryDetector(fullPath, buffer).catch(() => treatAsBinary);
  const isBinaryFile = treatAsBinary || binaryByDetector;

  if (isBinaryFile) {
    if (matchesAny(expectedBinaryMatchers, relativePath)) {
      return findings;
    }
    const signature = await hashFile(fullPath);
    findings.push({
      path: relativePath,
      line: null,
      matchType: "binary-review",
      snippet: `manual-review signature=${signature.slice(0, 16)}...`,
    });
    return findings;
  }

  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);
  const sourceSha256 = createHash("sha256").update(buffer).digest("hex");

  for (const detector of detectors) {
    if (detector.skipFile?.(relativePath)) continue;
    detector.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = detector.regex.exec(content))) {
      const rawMatch = match[0];
      const matchText = detector.transform ? detector.transform(match) : rawMatch;
      if (detector.type === "email" && shouldAllowEmail(matchText, config.allowEmails)) continue;
      if (config.allowMatches.includes(matchText)) continue;
      const matchIndex = match.index;
      const lineNumber = content.slice(0, matchIndex).split(/\r?\n/).length;
      findings.push(createRedactedTextFinding({
        path: relativePath,
        line: lineNumber,
        matchType: detector.type,
        matchText: rawMatch,
        offset: match.index,
        sourceSha256,
        label:
          detector.type === "env-line" || detector.type === "api-key"
            ? match[1]
            : undefined,
      }));
    }
  }

  if (options.customPattern) {
    options.customPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = options.customPattern.exec(content))) {
      const matchIndex = match.index;
      const lineNumber = content.slice(0, matchIndex).split(/\r?\n/).length;
      findings.push(createRedactedTextFinding({
        path: relativePath,
        line: lineNumber,
        matchType: "custom",
        matchText: match[0],
        offset: match.index,
        sourceSha256,
      }));
    }
  }

  if (/\.csv$/i.test(relativePath)) {
    const lowerContent = content.toLowerCase();
    const containsHeaders = csvHeaders.some((header) => lowerContent.includes(header));
    if (containsHeaders) {
      const rowCount = lines.length;
      if (rowCount >= 100) {
        findings.push({
          path: relativePath,
          line: null,
          matchType: "potential-pii",
          snippet: `headers found; rows ~${rowCount}`,
        });
      }
    }
  } else if (/\.json$/i.test(relativePath)) {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (Array.isArray(parsed) && parsed.length >= 100) {
        const keys = parsed
          .slice(0, 10)
          .flatMap((value) =>
            value && typeof value === "object" ? Object.keys(value) : [],
          )
          .map((key) => key.toLowerCase());
        if (csvHeaders.some((header) => keys.includes(header))) {
          findings.push({
            path: relativePath,
            line: null,
            matchType: "potential-pii",
            snippet: `record keys found; rows ${parsed.length}`,
          });
        }
      }
    } catch {
      // Invalid JSON is handled by its owning parser/build gate, not this heuristic.
    }
  }

  return findings;
}

function formatTableRows(findings: Finding[], chalk: ChalkLike, tableFormatter: TableFormatter) {
  const rows: string[][] = [
    [chalk.bold("Path"), chalk.bold("Line"), chalk.bold("Type"), chalk.bold("Snippet")],
    ...findings.map((finding) => [
      finding.path,
      finding.line ? String(finding.line) : "-",
      finding.matchType,
      finding.snippet,
    ]),
  ];
  return tableFormatter(rows);
}

async function main() {
  try {
    const options = parseArgs();
    const config = await readConfig();
    const chalk = await loadChalk();
    const tableFormatter = await loadTable();
    const createMatcher = await loadPicomatch();
    const binaryDetector = await loadBinaryDetector();

    const treatAsBinaryMatchers = buildMatchers(config.treatAsBinary, createMatcher);
    const expectedBinaryMatchers = buildMatchers(config.expectedBinary ?? [], createMatcher);

    const entries = await collectScanEntries(
      process.cwd(),
      config,
      createMatcher,
    );

    const findings: Finding[] = [];

    for (const relativePath of entries) {
      const fullPath = path.join(process.cwd(), relativePath);
      const stats = await fsp.lstat(fullPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (!stats || stats.isSymbolicLink()) continue;
      if (!stats.isFile()) continue;
      const fileFindings = await scanFile(
        relativePath,
        fullPath,
        stats,
        config,
        options,
        binaryDetector,
        treatAsBinaryMatchers,
        expectedBinaryMatchers,
      );
      findings.push(...fileFindings);
    }

    findings.sort((a, b) => a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0));

    const reportPath = path.join(process.cwd(), "scan-report.json");
    await atomicWritePrivateTextFile(
      reportPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2),
    );

    const limited = findings.slice(0, 50);

    if (options.outputJson) {
      console.log(JSON.stringify(limited, null, 2));
    } else if (limited.length > 0) {
      console.log(formatTableRows(limited, chalk, tableFormatter));
    } else {
      console.log(chalk.green("No sensitive data candidates found."));
    }

    console.log(chalk.cyan(`Findings: ${findings.length}. Full report saved to scan-report.json.`));
    if (findings.length > 0 && options.failOnFindings) {
      process.exitCode = 2;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const chalk = await loadChalk();
    console.error(chalk.red(message));
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  void main();
}
