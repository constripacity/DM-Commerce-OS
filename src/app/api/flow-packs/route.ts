import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { requireAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  flowPackSchema,
  scriptCategoryToStage,
  slugifyFlowStep,
  stageToScriptCategory,
} from "@/lib/flow-packs";
import { isTrustedMutationRequest } from "@/lib/security/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId");
  const [campaign, scripts] = await Promise.all([
    campaignId
      ? prisma.campaign.findUnique({ where: { id: campaignId } })
      : prisma.campaign.findFirst({ orderBy: { startsOn: "desc" } }),
    prisma.script.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
  ]);
  if (!campaign) {
    return NextResponse.json({ error: "Create a campaign before exporting a flow" }, { status: 404 });
  }

  const steps = scripts
    .map((script, index) => ({
      id: `${slugifyFlowStep(`${script.category}-${script.name}`, index)}-${index + 1}`,
      stage: scriptCategoryToStage(script.category),
      scriptName: script.name,
      template: script.body,
    }))
    .filter((step) =>
      ["pitch", "qualify", "objection", "checkout", "delivery"].includes(step.stage),
    );
  const parsed = flowPackSchema.safeParse({
    schemaVersion: 1,
    name: campaign.name,
    description: "Portable deterministic flow exported from DM Commerce OS.",
    keyword: campaign.keyword,
    steps,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Current scripts do not form an exportable flow", details: parsed.error.flatten() },
      { status: 409 },
    );
  }
  return NextResponse.json(parsed.data, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="flow-${campaign.keyword.toLowerCase()}.json"`,
    },
  });
}

export async function POST(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 100 * 1024) {
    return NextResponse.json({ error: "Flow pack exceeds 100 KB" }, { status: 413 });
  }
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Flow pack is not valid JSON" }, { status: 400 });
  }
  const parsed = flowPackSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const result = await prisma.$transaction(async (transaction) => {
    const campaign = await transaction.campaign.upsert({
      where: { keyword: parsed.data.keyword },
      update: { name: parsed.data.name },
      create: {
        name: parsed.data.name,
        keyword: parsed.data.keyword,
        platform: "generic",
        startsOn: now,
        endsOn: addDays(now, 30),
      },
    });
    for (const step of parsed.data.steps) {
      await transaction.script.upsert({
        where: { name: step.scriptName },
        update: {
          category: stageToScriptCategory(step.stage),
          body: step.template,
        },
        create: {
          name: step.scriptName,
          category: stageToScriptCategory(step.stage),
          body: step.template,
        },
      });
    }
    return { campaignId: campaign.id, importedSteps: parsed.data.steps.length };
  });

  return NextResponse.json(result, { status: 201 });
}
