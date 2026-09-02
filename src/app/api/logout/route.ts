import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { isTrustedMutationRequest } from "@/lib/security/request";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
