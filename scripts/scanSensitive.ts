#!/usr/bin/env tsx
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";

type Finding = {
  path: string;
  line: number | null;
  matchType: string;
  snippet: string;
  matchText: string;
};

type Config = {
  ignorePaths: string[];
  allowEmails: string[];
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

type Globber = (patterns: string[], options: { cwd: string; dot?: boolean; onlyFiles?: boolean; unique?: boolean; ignore?: string[] }) => Promise<string[]>;

type BinaryDetector = (filePath: string, buffer: Buffer) => Promise<boolean>;

const DEFAULT_CONFIG: Config = {
  ignorePaths: ["node_modules/**", ".next/**", ".git/**", "public/screenshots/**", "prisma/dev.db"],
  allowEmails: ["demo@local.test"],
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
    skipFile: (filePath) => filePath.endsWith(".env.example"),
  },
  { type: "email", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
];

const csvHeaders = ["name", "email", "phone", "address"];

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let outputJson = false;
  let customPattern: RegExp | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") {
      outputJson = true;
    } else if (arg === "--pattern") {
      const pattern = args[i + 1];
      if (!pattern) throw new Error("--pattern requires a value");
      customPattern = new RegExp(pattern, "g");
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { outputJson, customPattern };
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
      treatAsBinary: parsed.treatAsBinary ?? DEFAULT_CONFIG.treatAsBinary,
      expectedBinary: parsed.expectedBinary ?? DEFAULT_CONFIG.expectedBinary,
      maxFileBytes: parsed.maxFileBytes ?? DEFAULT_CONFIG.maxFileBytes,
    };
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

function sanitizeSnippet(snippet: string) {
  return snippet.replace(/\s+/g, " ").trim().slice(0, 160);
}

function shouldAllowEmail(value: string, allowList: string[]) {
  return allowList.some((allowed) => allowed.toLowerCase() === value.toLowerCase());
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
    const chalkInstance = (mod as any).default ?? (mod as any);
    const wrap = (method: string) => {
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
  } catch (error) {
    return { bold: identity, green: identity, cyan: identity, red: identity };
  }
}

async function loadTable(): Promise<TableFormatter> {
  try {
    const mod = await import("table");
    const tableFn = (mod as any).table ?? (mod as any).default;
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
  } catch (error) {
    // fall through to fallback
  }
  return (rows: string[][]) => rows.map((row) => row.join("  ")).join("\n");
}

async function loadPicomatch(): Promise<(pattern: string) => Matcher> {
  try {
    const mod = await import("picomatch");
    const factory = (mod as any).default ?? (mod as any);
    if (typeof factory === "function") {
      return (pattern: string) => {
        const matcher = factory(pattern, { dot: true });
        return (value: string) => Boolean(matcher(value));
      };
    }
  } catch (error) {
    // use fallback implementation below
  }
  return (pattern: string) => {
    const regex = globToRegExp(pattern);
    return (value: string) => regex.test(value);
  };
}

async function loadFastGlob(createMatcher: (pattern: string) => Matcher): Promise<Globber> {
  try {
    const mod = await import("fast-glob");
    const globFn = (mod as any).default ?? (mod as any);
    if (typeof globFn === "function") {
      return (patterns, options) => globFn(patterns, options);
    }
  } catch (error) {
    // fallback below
  }

  async function walkDirectory(
    cwd: string,
    currentDir: string,
    ignoreMatchers: Matcher[],
    dot: boolean,
    results: string[],
  ) {
    const dirents = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (!dot && dirent.name.startsWith(".")) continue;
      const absolute = path.join(currentDir, dirent.name);
      const relative = path.relative(cwd, absolute).split(path.sep).join("/");
      if (ignoreMatchers.some((matcher) => matcher(relative) || matcher(`${relative}/`))) {
        continue;
      }
      if (dirent.isDirectory()) {
        await walkDirectory(cwd, absolute, ignoreMatchers, dot, results);
      } else if (dirent.isFile()) {
        results.push(relative);
      }
    }
  }

  return async (patterns, options) => {
    const cwd = options.cwd ?? process.cwd();
    const dot = Boolean(options.dot);
    const ignoreMatchers = (options.ignore ?? []).map((pattern) => createMatcher(pattern));
    const includeMatchers = patterns.map((pattern) => createMatcher(pattern));
    const allFiles: string[] = [];
    await walkDirectory(cwd, cwd, ignoreMatchers, dot, allFiles);
    const filtered = allFiles.filter((relative) => {
      if (ignoreMatchers.some((matcher) => matcher(relative))) return false;
      return includeMatchers.some((matcher) => matcher(relative));
    });
    return options.unique ? Array.from(new Set(filtered)) : filtered;
  };
}

async function loadBinaryDetector(): Promise<BinaryDetector> {
  try {
    const mod = await import("istextorbinary");
    const isBinary = (mod as any).isBinary ?? (mod as any).default;
    if (typeof isBinary === "function") {
      return (filePath: string, buffer: Buffer) =>
        new Promise<boolean>((resolve, reject) => {
          isBinary(filePath, buffer, (error: Error | null, result?: boolean) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(Boolean(result));
          });
        });
    }
  } catch (error) {
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
      matchText: signature,
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
      matchText: signature,
    });
    return findings;
  }

  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);

  for (const detector of detectors) {
    if (detector.skipFile?.(relativePath)) continue;
    detector.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = detector.regex.exec(content))) {
      const matchText = detector.transform ? detector.transform(match) : match[0];
      if (detector.type === "email" && shouldAllowEmail(matchText, config.allowEmails)) continue;
      const matchIndex = match.index;
      const lineNumber = content.slice(0, matchIndex).split(/\r?\n/).length;
      const snippet = sanitizeSnippet(lines[lineNumber - 1] ?? matchText);
      findings.push({
        path: relativePath,
        line: lineNumber,
        matchType: detector.type,
        snippet,
        matchText,
      });
    }
  }

  if (options.customPattern) {
    options.customPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = options.customPattern.exec(content))) {
      const matchText = match[0];
      const matchIndex = match.index;
      const lineNumber = content.slice(0, matchIndex).split(/\r?\n/).length;
      const snippet = sanitizeSnippet(lines[lineNumber - 1] ?? matchText);
      findings.push({
        path: relativePath,
        line: lineNumber,
        matchType: "custom",
        snippet,
        matchText,
      });
    }
  }

  if (/\.(csv|json)$/i.test(relativePath)) {
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
          matchText: `${rowCount}`,
        });
      }
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
    const globber = await loadFastGlob(createMatcher);
    const binaryDetector = await loadBinaryDetector();

    const treatAsBinaryMatchers = buildMatchers(config.treatAsBinary, createMatcher);
    const expectedBinaryMatchers = buildMatchers(config.expectedBinary ?? [], createMatcher);

    const entries = await globber(["**/*"], {
      cwd: process.cwd(),
      dot: true,
      onlyFiles: true,
      unique: true,
      ignore: config.ignorePaths,
    });

    const findings: Finding[] = [];

    for (const relativePath of entries) {
      const fullPath = path.join(process.cwd(), relativePath);
      const stats = await fsp.stat(fullPath);
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
    await fsp.writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));

    const limited = findings.slice(0, 50);

    if (options.outputJson) {
      console.log(JSON.stringify(limited, null, 2));
    } else if (limited.length > 0) {
      console.log(formatTableRows(limited, chalk, tableFormatter));
    } else {
      console.log(chalk.green("No sensitive data candidates found."));
    }

    console.log(chalk.cyan(`Findings: ${findings.length}. Full report saved to scan-report.json.`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const chalk = await loadChalk();
    console.error(chalk.red(message));
    process.exitCode = 1;
  }
}

void main();
