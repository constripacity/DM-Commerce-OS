#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { transformSync } = require("esbuild");

const [, , entryFile, ...forwardArgs] = process.argv;

if (!entryFile) {
  console.error("Usage: tsx <file.ts> [args]");
  process.exit(1);
}

const resolvedEntry = path.resolve(process.cwd(), entryFile);
const source = fs.readFileSync(resolvedEntry, "utf8");
process.argv = [process.argv[0], resolvedEntry, ...forwardArgs];
const { code } = transformSync(source, {
  loader: "ts",
  format: "cjs",
  target: "es2020",
  sourcemap: "inline",
});

const mod = new Module(resolvedEntry, module.parent ?? module);
mod.filename = resolvedEntry;
mod.paths = Module._nodeModulePaths(path.dirname(resolvedEntry));
mod._compile(code, resolvedEntry);

if (typeof mod.exports === "function") {
  mod.exports(...forwardArgs);
}
