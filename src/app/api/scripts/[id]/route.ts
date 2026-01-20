import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { scriptSchema } from "@/lib/validators";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = scriptSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const script = await prisma.script.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(script);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.script.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
