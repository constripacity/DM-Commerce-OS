import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const filesDir = path.join(process.cwd(), "public", "files");
    const entries = await readdir(filesDir);
    const results = await Promise.all(
      entries
        .filter((file) => file.endsWith(".pdf"))
        .map(async (file) => {
          const filePath = path.join(filesDir, file);
          const fileStat = await stat(filePath);
          return { path: `/files/${file}`, size: fileStat.size };
        })
    );
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read files" }, { status: 500 });
  }
}
