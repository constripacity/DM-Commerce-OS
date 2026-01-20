import { addDays } from "date-fns";

const angles = ["Transformation", "Quick Tip", "Myth Busting", "Checklist"] as const;

export type CampaignAngle = (typeof angles)[number];
export type CampaignContentType = "Post" | "Story";

export interface CampaignPlanEntry {
  type: CampaignContentType;
  angle: CampaignAngle;
  hook: string;
  cta: string;
  schedule: string;
  hashtags?: string[];
}

export interface CampaignPlanInput {
  keyword: string;
  startDate: Date;
  posts?: number;
  stories?: number;
  includeHashtags?: boolean;
}

const hashtagLibrary: Record<CampaignAngle, string[]> = {
  Transformation: ["#DMWins", "#CreatorGlowUp", "#DMFlows"],
  "Quick Tip": ["#DMHacks", "#LaunchSnacks", "#CreatorTips"],
  "Myth Busting": ["#DMTruth", "#CreatorFacts", "#LaunchMyths"],
  Checklist: ["#LaunchChecklist", "#DMPrep", "#CreatorSystems"],
};

const defaultPosts = 10;
const defaultStories = 10;

export function generateCampaignPlan({
  keyword,
  startDate,
  posts = defaultPosts,
  stories = defaultStories,
  includeHashtags = false,
}: CampaignPlanInput): CampaignPlanEntry[] {
  const cta = `DM ${keyword.toUpperCase()}`;
  const items: CampaignPlanEntry[] = [];

  for (let i = 0; i < posts; i += 1) {
    const angle = angles[i % angles.length];
    const schedule = addDays(startDate, i * 2);
    items.push({
      type: "Post",
      angle,
      hook: generateHook(angle, keyword, "post"),
      cta,
      schedule: toISODate(schedule),
      hashtags: includeHashtags ? hashtagLibrary[angle] : undefined,
    });
  }

  for (let i = 0; i < stories; i += 1) {
    const angle = angles[i % angles.length];
    const schedule = addDays(startDate, i * 2 + 1);
    items.push({
      type: "Story",
      angle,
      hook: generateHook(angle, keyword, "story"),
      cta,
      schedule: toISODate(schedule),
      hashtags: includeHashtags ? hashtagLibrary[angle] : undefined,
    });
  }

  return items.sort((a, b) => a.schedule.localeCompare(b.schedule));
}

export function campaignPlanToCsv(plan: CampaignPlanEntry[]) {
  const header = ["Type", "Angle", "Hook", "CTA", "Schedule", "Hashtags"];
  const rows = plan.map((entry) => [
    entry.type,
    entry.angle,
    entry.hook,
    entry.cta,
    entry.schedule,
    entry.hashtags?.join(" ") ?? "",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}

export function campaignPlanToText(plan: CampaignPlanEntry[]) {
  return plan
    .map((entry) => {
      const base = `${entry.schedule} • ${entry.type} (${entry.angle})\nHook: ${entry.hook}\nCTA: ${entry.cta}`;
      if (entry.hashtags?.length) {
        return `${base}\nHashtags: ${entry.hashtags.join(" ")}`;
      }
      return base;
    })
    .join("\n\n");
}

function escapeCsv(value: string) {
  const needsQuotes = value.includes(",") || value.includes("\n") || value.includes('"');
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function generateHook(angle: CampaignAngle, keyword: string, type: "post" | "story") {
  const callout = `DM ${keyword.toUpperCase()}`;
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
        ? `Launch-day DM checklist: trigger keyword, qualify fast, deliver instantly. Save + ${callout} for the template.`
        : `Story CTA: “${callout}” to get the 5-point checklist we run before any promo goes live.`;
    default:
      return `Fresh angle on your launch. ${callout} for the swipe copy.`;
  }
}
