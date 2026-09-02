import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { scriptSchema } from "@/lib/validators";
import { isTrustedMutationRequest } from "@/lib/security/request";
import { databaseMutationError } from "@/lib/api/database-errors";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scripts = await prisma.script.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(scripts);
}

export async function POST(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = scriptSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const script = await prisma.script.create({ data: parsed.data });
    return NextResponse.json(script, { status: 201 });
  } catch (error) {
    return databaseMutationError(error, "Script");
  }
}
