import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";

const angles = [
  "Transformation",
  "Quick Tip",
  "Myth Busting",
  "Checklist",
];

function dateToISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function escapeCsv(value: string) {
  const needsQuotes = value.includes(",") || value.includes("\n") || value.includes('"');
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function buildRows(keyword: string, startDate: Date) {
  const rows: string[][] = [["Type", "Angle", "Hook", "CTA", "Schedule"]];
  const cta = `DM ${keyword}`;
  for (let i = 0; i < 10; i += 1) {
    const angle = angles[i % angles.length];
    const schedule = new Date(startDate);
    schedule.setDate(schedule.getDate() + i * 2);
    rows.push([
      "Post",
      angle,
      generateHook(angle, keyword, "post"),
      cta,
      dateToISO(schedule),
    ]);
  }
  for (let i = 0; i < 10; i += 1) {
    const angle = angles[i % angles.length];
    const schedule = new Date(startDate);
    schedule.setDate(schedule.getDate() + i * 2 + 1);
    rows.push([
      "Story",
      angle,
      generateHook(angle, keyword, "story"),
      cta,
      dateToISO(schedule),
    ]);
  }
  return rows;
}

function generateHook(angle: string, keyword: string, type: "post" | "story") {
  const callout = `DM ${keyword}`;
  switch (angle) {
    case "Transformation":
      return type === "post"
        ? `Before → after: how one creator flipped their DMs into revenue with a repeatable flow. ${callout} to steal the steps.`
        : `Peep the DM makeover: a 3-message script that warms leads fast. ${callout} for the swipe copy.`;
    case "Quick Tip":
      return type === "post"
        ? `3-line opener that gets warm leads to reply within minutes. Drop ${callout} and I'll DM the prompt.`
        : `Story prompt: record a 15s clip sharing the “one line to revive cold leads.” ${callout} to get the full script.`;
    case "Myth Busting":
      return type === "post"
        ? `Myth: you need a funnel to sell. Reality: a DM keyword does the heavy lifting. ${callout} to see the receipts.`
        : `Story frame: “Thought DMs feel spammy? Try this permission-first line.” ${callout} for the copy + follow-ups.`;
    case "Checklist":
      return type === "post"
        ? `Launch-day DM checklist: trigger keyword, qualify fast, deliver instantly. Save + DM ${callout} for the template.`
        : `Story CTA: “DM ${keyword}” to get the 5-point checklist we run before any promo goes live.`;
    default:
      return `Fresh angle on your launch. ${callout} for the swipe copy.`;
  }
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const startDate = campaign.startsOn ?? new Date();
  const rows = buildRows(campaign.keyword, startDate);
  const csv = toCsv(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-${campaign.keyword}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
