import { NextResponse } from "next/server";
import { requireAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  managedLogoRouteForFilename,
  managedLogoRoutePath,
  readManagedLogoUpload,
} from "@/lib/security/managed-uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const { filename } = await context.params;
  const requestedPath = managedLogoRouteForFilename(filename);
  if (!requestedPath) {
    return NextResponse.json(
      { error: "Logo not found" },
      { status: 404, headers: noStoreHeaders },
    );
  }
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { logoPath: true },
  });
  if (managedLogoRoutePath(setting?.logoPath) !== requestedPath) {
    return NextResponse.json(
      { error: "Logo not found" },
      { status: 404, headers: noStoreHeaders },
    );
  }
  const upload = await readManagedLogoUpload(requestedPath);
  if (!upload) {
    return NextResponse.json(
      { error: "Logo not found" },
      { status: 404, headers: noStoreHeaders },
    );
  }

  return new Response(new Uint8Array(upload.bytes), {
    headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Content-Length": String(upload.bytes.length),
      "Content-Type": upload.contentType,
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
