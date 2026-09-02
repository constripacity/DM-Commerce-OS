import { formatCurrencyFromCents } from "@/lib/format";

export type DMFlowStage = "pitch" | "qualify" | "checkout" | "delivery" | "objection";

export interface DMFlowMessage {
  role: "user" | "assistant";
  text: string;
  stage?: DMFlowStage;
}

export interface DMFlowScripts {
  pitch?: string;
  qualify?: string;
  checkout?: string;
  delivery?: string;
  objection?: string;
}

export interface DMFlowContext {
  messages: DMFlowMessage[];
  latestUserMessage: string;
  keyword: string;
  scripts: DMFlowScripts;
  product: {
    title: string;
    priceCents: number;
  };
}

export interface DMFlowResult {
  stage: DMFlowStage;
  text: string;
  intent: DMIntent;
}

export type DMIntent =
  | "keyword"
  | "interest"
  | "checkout"
  | "purchase"
  | "objection"
  | "neutral";

const interestKeywords = ["yes", "yeah", "yep", "yup", "sure", "interested", "sounds", "great", "cool", "love", "want", "tell me more", "ready"];
const checkoutKeywords = ["how", "price", "cost", "link", "checkout", "buy", "purchase", "send", "share", "where"];
const purchaseKeywords = ["bought", "paid", "done", "completed", "grabbed", "purchased", "checkout complete", "i'm in", "got it"];
const objectionKeywords = ["not sure", "maybe", "later", "expensive", "costly", "can't", "cant", "don't know", "idk", "unsure", "think about"];

const stageMarkerRegex = /\[\[stage:(pitch|qualify|checkout|delivery|objection)\]\]/i;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesSignal(message: string, signal: string) {
  const normalizedSignal = signal.toLowerCase().replace(/[’]/g, "'");
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(normalizedSignal)}(?:$|[^a-z0-9])`, "i").test(
    message,
  );
}

export function classifyDMIntent(message: string, keyword = ""): DMIntent {
  const normalized = message.trim().toLowerCase().replace(/[’]/g, "'");
  if (!normalized) return "neutral";
  // Objections win over generic interest words ("yes, but too expensive").
  if (objectionKeywords.some((signal) => matchesSignal(normalized, signal))) {
    return "objection";
  }
  if (purchaseKeywords.some((signal) => matchesSignal(normalized, signal))) {
    return "purchase";
  }
  if (checkoutKeywords.some((signal) => matchesSignal(normalized, signal))) {
    return "checkout";
  }
  if (interestKeywords.some((signal) => matchesSignal(normalized, signal))) {
    return "interest";
  }
  if (keyword && matchesSignal(normalized, keyword)) return "keyword";
  return "neutral";
}

export function attachStageMarker(text: string, stage: DMFlowStage) {
  return `${text} [[stage:${stage}]]`;
}

export function parseStageFromText(text: string) {
  const match = text.match(stageMarkerRegex);
  if (!match) {
    return { text, stage: undefined as DMFlowStage | undefined };
  }
  const cleanText = text.replace(stageMarkerRegex, "").trim();
  return { text: cleanText, stage: match[1].toLowerCase() as DMFlowStage };
}

export function fillTemplate(template: string, replacements: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const value = replacements[key];
    return value ?? `{{${key}}}`;
  });
}

export function getNextAutoReply(context: DMFlowContext): DMFlowResult | null {
  const { messages, latestUserMessage, keyword, scripts, product } = context;
  if (!latestUserMessage.trim()) {
    return null;
  }

  const hasStage = (stage: DMFlowStage) => messages.some((message) => message.stage === stage);
  const isEntryKeyword =
    !hasStage("pitch") && Boolean(keyword) && matchesSignal(latestUserMessage, keyword);
  const intent = isEntryKeyword ? "keyword" : classifyDMIntent(latestUserMessage, keyword);
  const replacements = {
    product: product.title,
    price: formatCurrencyFromCents(product.priceCents),
    keyword,
  };

  const scriptTexts = {
    pitch: scripts.pitch ? fillTemplate(scripts.pitch, replacements) : undefined,
    qualify: scripts.qualify ? fillTemplate(scripts.qualify, replacements) : undefined,
    checkout: scripts.checkout ? fillTemplate(scripts.checkout, replacements) : undefined,
    delivery: scripts.delivery ? fillTemplate(scripts.delivery, replacements) : undefined,
    objection: scripts.objection ? fillTemplate(scripts.objection, replacements) : undefined,
  };

  if (!hasStage("pitch") && intent === "keyword" && scriptTexts.pitch) {
    return { stage: "pitch", text: scriptTexts.pitch, intent };
  }

  if (intent === "objection" && !hasStage("objection") && scriptTexts.objection) {
    return { stage: "objection", text: scriptTexts.objection, intent };
  }

  if (hasStage("pitch") && !hasStage("qualify") && intent === "interest" && scriptTexts.qualify) {
    return { stage: "qualify", text: scriptTexts.qualify, intent };
  }

  if (
    hasStage("qualify") &&
    !hasStage("checkout") &&
    (intent === "checkout" || intent === "interest") &&
    scriptTexts.checkout
  ) {
    return { stage: "checkout", text: scriptTexts.checkout, intent };
  }

  if (hasStage("checkout") && !hasStage("delivery") && intent === "purchase" && scriptTexts.delivery) {
    return { stage: "delivery", text: scriptTexts.delivery, intent };
  }

  return null;
}
