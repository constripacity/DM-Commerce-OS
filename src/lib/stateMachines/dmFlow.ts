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
}

const interestKeywords = ["yes", "yeah", "yep", "yup", "sure", "interested", "sounds", "great", "cool", "love", "want", "tell me more", "ready"];
const checkoutKeywords = ["how", "price", "cost", "link", "checkout", "buy", "purchase", "send", "share", "where"];
const purchaseKeywords = ["bought", "paid", "done", "completed", "grabbed", "purchased", "checkout complete", "i'm in", "got it"];
const objectionKeywords = ["not sure", "maybe", "later", "expensive", "costly", "can't", "cant", "don't know", "idk", "unsure", "think about"];

const stageMarkerRegex = /\[\[stage:(pitch|qualify|checkout|delivery|objection)\]\]/i;

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

  const normalized = latestUserMessage.toLowerCase();
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

  const hasStage = (stage: DMFlowStage) => messages.some((message) => message.stage === stage);
  const hasKeyword = keyword ? normalized.includes(keyword.toLowerCase()) : false;
  const interestIntent = interestKeywords.some((word) => normalized.includes(word));
  const checkoutIntent = checkoutKeywords.some((word) => normalized.includes(word));
  const purchaseIntent = purchaseKeywords.some((word) => normalized.includes(word));
  const objectionIntent = objectionKeywords.some((word) => normalized.includes(word));

  if (!hasStage("pitch") && hasKeyword && scriptTexts.pitch) {
    return { stage: "pitch", text: scriptTexts.pitch };
  }

  if (objectionIntent && !hasStage("objection") && scriptTexts.objection) {
    return { stage: "objection", text: scriptTexts.objection };
  }

  if (hasStage("pitch") && !hasStage("qualify") && interestIntent && scriptTexts.qualify) {
    return { stage: "qualify", text: scriptTexts.qualify };
  }

  if (hasStage("qualify") && !hasStage("checkout") && (checkoutIntent || interestIntent) && scriptTexts.checkout) {
    return { stage: "checkout", text: scriptTexts.checkout };
  }

  if (hasStage("checkout") && !hasStage("delivery") && purchaseIntent && scriptTexts.delivery) {
    return { stage: "delivery", text: scriptTexts.delivery };
  }

  return null;
}
