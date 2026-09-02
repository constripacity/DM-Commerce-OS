#!/usr/bin/env ts-node
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Git conflict markers occupy their own line. Looking for the raw character
// sequences anywhere makes this checker flag documentation (and itself).
const CONFLICT_MARKER = /^\s*(?:<{7}|={7}|>{7})(?:\s|$)/m;
const IGNORE_DIRS = new Set([".git", "node_modules", ".next", "dist", "out", ".turbo"]);

function scan(directory: string): string[] {
  const hits: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      hits.push(...scan(fullPath));
    } else if (stats.isFile()) {
      const bytes = readFileSync(fullPath);
      if (bytes.includes(0)) continue;
      const content = bytes.toString("utf8");
      if (CONFLICT_MARKER.test(content)) {
        hits.push(fullPath);
      }
    }
  }
  return hits;
}

const conflicts = scan(process.cwd());

if (conflicts.length) {
  console.error("\n❌ Merge conflict markers detected in these files:\n");
  for (const file of conflicts) {
    console.error(` - ${file}`);
  }
  console.error("\nResolve the standard Git conflict-marker lines before committing or running CI.\n");
  process.exit(1);
}

console.log("✅ No merge conflict markers found.");
