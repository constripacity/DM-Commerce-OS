#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const deliveryFiles = ["creator-guide.pdf", "checklist.pdf"];

export function validatePdfStructure(bytes: Buffer, label: string) {
  const content = bytes.toString("latin1");
  if (!content.startsWith("%PDF-")) throw new Error(`${label}: missing PDF header`);
  if (!/\/Type\s*\/Page\b/.test(content)) throw new Error(`${label}: missing page object`);
  const trailer = content.match(/startxref\s+(\d+)\s+%%EOF\s*$/);
  if (!trailer) throw new Error(`${label}: missing numeric startxref/trailer`);
  const xrefOffset = Number(trailer[1]);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset < 1 || xrefOffset >= bytes.length) {
    throw new Error(`${label}: invalid xref offset`);
  }
  if (content.slice(xrefOffset, xrefOffset + 4) !== "xref") {
    throw new Error(`${label}: startxref does not point to the xref table`);
  }
  const objectCount = content.match(/\d+\s+\d+\s+obj\b/g)?.length ?? 0;
  if (objectCount < 4) throw new Error(`${label}: incomplete PDF object graph`);
}

function main() {
  for (const filename of deliveryFiles) {
    const filePath = path.join(process.cwd(), "public", "files", filename);
    const bytes = readFileSync(filePath);
    validatePdfStructure(bytes, filename);

    const parsed = spawnSync("pdfinfo", [filePath], { encoding: "utf8" });
    if (!parsed.error && parsed.status !== 0) {
      throw new Error(`${filename}: pdfinfo rejected the fixture: ${parsed.stderr.trim()}`);
    }
    console.log(
      `${filename}: PASS (${bytes.length} bytes${parsed.error ? ", structural validation" : ", pdfinfo parsed"})`,
    );
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
