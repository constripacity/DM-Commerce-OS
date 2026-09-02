import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { campaignSchema } from "@/lib/validators";
import { isTrustedMutationRequest } from "@/lib/security/request";
import { databaseMutationError } from "@/lib/api/database-errors";

function normalizeDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return date;
}

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    orderBy: { startsOn: "asc" },
  });

  return NextResponse.json(campaigns);
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

  const parsed = campaignSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let startsOn: Date;
  let endsOn: Date;
  try {
    startsOn = normalizeDate(parsed.data.startsOn);
    endsOn = normalizeDate(parsed.data.endsOn);
  } catch {
    return NextResponse.json({ error: "Campaign dates must be valid" }, { status: 400 });
  }
  if (startsOn > endsOn) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: parsed.data.name,
        keyword: parsed.data.keyword.toUpperCase(),
        platform: parsed.data.platform,
        startsOn,
        endsOn,
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return databaseMutationError(error, "Campaign");
  }
}
