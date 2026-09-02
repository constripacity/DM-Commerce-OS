import { NextResponse } from "next/server";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { requireAuthCookie } from "@/lib/auth";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const filesDir = path.join(process.cwd(), "public", "files");
    const entries = await readdir(filesDir, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isFile() && /^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/.test(entry.name),
        )
        .map(async (entry) => {
          const filePath = path.join(filesDir, entry.name);
          const fileStat = await lstat(filePath);
          return { path: `/files/${entry.name}`, size: fileStat.size };
        })
    );
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read files" }, { status: 500 });
  }
}
