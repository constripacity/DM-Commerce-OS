import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { campaignSchema } from "@/lib/validators";

function normalizeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return date;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = campaignSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const startsOn = normalizeDate(parsed.data.startsOn);
  const endsOn = normalizeDate(parsed.data.endsOn);
  if (startsOn > endsOn) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      keyword: parsed.data.keyword.toUpperCase(),
      platform: parsed.data.platform,
      startsOn,
      endsOn,
    },
  });

  return NextResponse.json(campaign);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
