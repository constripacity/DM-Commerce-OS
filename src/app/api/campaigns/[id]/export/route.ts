import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { campaignPlanToCsv, generateCampaignPlan } from "@/lib/campaigns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const posts = clampCount(url.searchParams.get("posts"));
  const stories = clampCount(url.searchParams.get("stories"));
  const includeHashtags = url.searchParams.get("hashtags") === "1";

  const startDate = campaign.startsOn ?? new Date();
  const plan = generateCampaignPlan({
    keyword: campaign.keyword,
    startDate,
    posts,
    stories,
    includeHashtags,
  });
  const csv = campaignPlanToCsv(plan);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-${campaign.keyword}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function clampCount(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(Math.max(parsed, 1), 30);
}
