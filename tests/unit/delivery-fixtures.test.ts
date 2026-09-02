import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validatePdfStructure } from "../../scripts/validate-delivery-files";

describe("seeded delivery fixtures", () => {
  it.each(["creator-guide.pdf", "checklist.pdf"])(
    "parses %s as a complete PDF with a real xref target",
    (filename) => {
      const bytes = readFileSync(path.join(process.cwd(), "public", "files", filename));
      expect(() => validatePdfStructure(bytes, filename)).not.toThrow();
    },
  );

  it("rejects the previously shipped missing-startxref shape", () => {
    const broken = Buffer.from("%PDF-1.4\n1 0 obj<</Type /Page>>endobj\nstartxref\n%%EOF\n");
    expect(() => validatePdfStructure(broken, "broken.pdf")).toThrow("startxref");
  });
});
