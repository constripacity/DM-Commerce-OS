import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { resetDemoData } from "@/lib/demo-reset";
import { isTrustedMutationRequest } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const result = await resetDemoData(prisma);
  return NextResponse.json({ status: "reset", ...result });
}
