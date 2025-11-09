#!/usr/bin/env ts-node
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const MARKERS = ["<<<<<<<", "=======", ">>>>>>>"];
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
      const content = readFileSync(fullPath, "utf8");
      if (MARKERS.some((marker) => content.includes(marker))) {
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
  console.error("\nResolve conflicts (remove <<<<<<<, =======, >>>>>>>) before committing or running CI.\n");
  process.exit(1);
}

console.log("✅ No merge conflict markers found.");
