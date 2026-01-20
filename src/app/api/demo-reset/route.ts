import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { runDemoSeed } from "@/lib/demo-reset";

export async function POST(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await runDemoSeed(prisma);
  return NextResponse.json({ status: "reset" });
}
