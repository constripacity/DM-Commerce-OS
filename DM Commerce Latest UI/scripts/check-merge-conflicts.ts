#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CONFLICT_MARKERS = ['<<' + '<<<<<', '===' + '====', '>>' + '>>>>>'];
const EXCLUDE_DIRS = ['.git', '.next', 'node_modules', 'dist', 'build', '.turbo'];

function checkDirectory(dir: string): string[] {
  const conflicts: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry)) {
          conflicts.push(...checkDirectory(fullPath));
        }
      } else if (stat.isFile()) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const hasConflict = CONFLICT_MARKERS.some((marker) =>
            content.includes(marker)
          );

          if (hasConflict) {
            conflicts.push(fullPath);
          }
        } catch (err) {
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }

  return conflicts;
}

function main() {
  const rootDir = process.cwd();
  console.log('Checking for merge conflict markers...\n');

  const conflicts = checkDirectory(rootDir);

  if (conflicts.length > 0) {
    console.error('❌ Merge conflict markers found in the following files:\n');
    conflicts.forEach((file) => {
      console.error(`  - ${file.replace(rootDir, '.')}`);
    });
    console.error(
      '\n⚠️  Please resolve merge conflicts before committing or pushing.\n'
    );
    process.exit(1);
  } else {
    console.log('✅ No merge conflict markers found.\n');
    process.exit(0);
  }
}

main();
