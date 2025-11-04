"use client";

import * as React from "react";
import type { Campaign, Script } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { ChatWindow, type ChatMessageItem } from "@/components/chat/chat-window";
import { ChatInput, type SlashCommand } from "@/components/chat/chat-input";
import { VariableChip } from "@/components/chat/variable-chip";
import { IntentBadge } from "@/components/chat/intent-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { fillTemplate, getNextAutoReply, attachStageMarker, parseStageFromText, type DMFlowStage } from "@/lib/stateMachines/dmFlow";
import { formatCurrencyFromCents } from "@/lib/format";
import { useHotkeys } from "@/hooks/use-hotkeys";

interface ScriptGroup {
  category: string;
  items: Script[];
}

interface InspectorState {
  stage?: DMFlowStage;
  next?: DMFlowStage;
  intent: "keyword" | "interest" | "checkout" | "purchase" | "objection" | "neutral";
}

const stageOrder: DMFlowStage[] = ["pitch", "qualify", "checkout", "delivery"];
const categoryStageMap: Record<string, DMFlowStage> = {
  pitch: "pitch",
  qualify: "qualify",
  checkout: "checkout",
  delivery: "delivery",
  objections: "objection",
};
const stageCategoryMap: Record<DMFlowStage, string> = {
  pitch: "pitch",
  qualify: "qualify",
  checkout: "checkout",
  delivery: "delivery",
  objection: "objections",
};

const interestSignals = ["yes", "yeah", "yep", "sure", "interested", "sounds", "great", "cool", "love", "want", "ready"];
const checkoutSignals = ["how", "price", "cost", "link", "checkout", "buy", "purchase", "send", "share", "where"];
const purchaseSignals = ["bought", "paid", "done", "completed", "grabbed", "purchased", "checkout complete", "i'm in", "got it"];
const objectionSignals = ["not sure", "maybe", "later", "expensive", "costly", "can't", "cant", "don't know", "idk", "unsure", "think about"];
const categoryLabelMap: Record<string, string> = {
  pitch: "Pitch",
  qualify: "Qualify",
  checkout: "Checkout",
  delivery: "Delivery",
  objections: "Objection",
};
const intentDisplayMap: Record<InspectorState["intent"], { label: string; tone: "positive" | "neutral" | "caution" }> = {
  neutral: { label: "Neutral", tone: "neutral" },
  keyword: { label: "Keyword detected", tone: "positive" },
  interest: { label: "High interest", tone: "positive" },
  checkout: { label: "Checkout questions", tone: "positive" },
  purchase: { label: "Likely purchased", tone: "positive" },
  objection: { label: "Objection signalled", tone: "caution" },
};

export function DMStudioTab() {
  const { products } = useDashboardData();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [messages, setMessages] = React.useState<ChatMessageItem[]>([]);
  const [sessionId, setSessionId] = React.useState(() => crypto.randomUUID());
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState<string>("pitch");
  const [scriptSelections, setScriptSelections] = React.useState<Record<string, string | undefined>>({});
  const [scriptOrder, setScriptOrder] = React.useState<Record<string, string[]>>({});
  const [inspector, setInspector] = React.useState<InspectorState>({ intent: "neutral" });

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0];
  const selectedProduct = products.find((product) => product.id === (selectedProductId ?? products[0]?.id));

  const replacements = React.useMemo(
    () => ({
      product: selectedProduct?.title ?? "your product",
      price: selectedProduct ? formatCurrencyFromCents(selectedProduct.priceCents) : "$0",
      keyword: selectedCampaign?.keyword ?? "GUIDE",
    }),
    [selectedProduct, selectedCampaign]
  );

  React.useEffect(() => {
    async function loadMetadata() {
      try {
        const [campaignRes, scriptRes] = await Promise.all([fetch("/api/campaigns"), fetch("/api/scripts")]);
        if (!campaignRes.ok || !scriptRes.ok) throw new Error("Unable to load DM assets");
        const [campaignData, scriptData] = await Promise.all([campaignRes.json(), scriptRes.json()]);
        setCampaigns(campaignData);
        setScripts(scriptData);
        setSelectedCampaignId((current) => current ?? campaignData[0]?.id ?? null);
        setScriptSelections((current) => {
          const next = { ...current };
          for (const script of scriptData) {
            if (!next[script.category]) {
              next[script.category] = script.id;
            }
          }
          return next;
        });
        setScriptOrder(() => {
          const grouped = groupScripts(scriptData);
          const result: Record<string, string[]> = {};
          for (const group of grouped) {
            result[group.category] = group.items.map((item) => item.id);
          }
          return result;
        });
      } catch (error) {
        toast({
          title: "Failed to load DM library",
          description: error instanceof Error ? error.message : "",
          variant: "destructive",
        });
      }
    }
    loadMetadata();
  }, [toast]);

  React.useEffect(() => {
    if (!selectedProductId && products[0]) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  React.useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/messages?sessionId=${sessionId}`);
        if (!res.ok) throw new Error("Unable to load messages");
        const data = await res.json();
        const mapped: ChatMessageItem[] = data.map((item: any) => {
          const parsed = parseStageFromText(item.text);
          return {
            id: item.id,
            role: item.role,
            text: parsed.text,
            stage: parsed.stage,
            timestamp: new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        });
        setMessages(mapped);
      } catch (error) {
        toast({
          title: "Failed to load thread",
          description: error instanceof Error ? error.message : "",
          variant: "destructive",
        });
      }
    }
    loadMessages();
  }, [sessionId, toast]);

  const scriptGroups = React.useMemo(() => groupScripts(scripts), [scripts]);

  React.useEffect(() => {
    setInspector(buildInspectorState(messages, replacements.keyword));
  }, [messages, replacements.keyword]);

  const getScriptBody = React.useCallback(
    (category: string) => {
      const resolvedCategory = stageCategoryMap[category as DMFlowStage] ?? category;
      const scriptId = scriptSelections[resolvedCategory];
      const script = scripts.find((item) => item.id === scriptId);
      return script ? fillTemplate(script.body, replacements) : undefined;
    },
    [replacements, scriptSelections, scripts]
  );

  const insertScriptBody = React.useCallback(
    (body: string) => {
      const content = fillTemplate(body, replacements);
      setDraft((prev) => `${prev.trim()}\n${content}`.trimStart());
    },
    [replacements]
  );

  const determineNextScript = React.useCallback(() => {
    const { completed } = getStageProgress(messages);
    const nextStage = computeNextStage(completed);
    if (!nextStage) return null;
    return getScriptBody(nextStage) ?? null;
  }, [getScriptBody, messages]);

  const buildFlowContext = React.useCallback(
    (latestUser: string) => {
      const dmMessages = messages.map((message) => ({
        role: message.role,
        text: message.stage ? attachStageMarker(message.text, message.stage as DMFlowStage) : message.text,
        stage: message.stage as DMFlowStage | undefined,
      }));
      const flowScripts = {
        pitch: getScriptBody("pitch"),
        qualify: getScriptBody("qualify"),
        checkout: getScriptBody("checkout"),
        delivery: getScriptBody("delivery"),
        objection: getScriptBody("objection"),
      };
      return {
        messages: dmMessages,
        latestUserMessage: latestUser,
        keyword: replacements.keyword,
        scripts: flowScripts,
        product: { title: replacements.product, priceCents: selectedProduct?.priceCents ?? 0 },
      };
    },
    [getScriptBody, messages, replacements, selectedProduct]
  );

  const persistMessage = React.useCallback(
    async (message: { role: "user" | "assistant"; text: string; stage?: DMFlowStage }) => {
      const payload = {
        sessionId,
        role: message.role,
        text: message.stage ? attachStageMarker(message.text, message.stage) : message.text,
      };
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    [sessionId]
  );

  const maybeRespond = React.useCallback(
    async (latestUser: string) => {
      const context = buildFlowContext(latestUser);
      const result = getNextAutoReply(context);
      if (!result) return;
      setIsTyping(true);
      const assistantMessage: ChatMessageItem = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: result.text,
        stage: result.stage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await persistMessage({ role: "assistant", text: result.text, stage: result.stage });
      setIsTyping(false);
    },
    [buildFlowContext, persistMessage]
  );

  const handleSend = React.useCallback(async () => {
    if (!draft.trim()) return;
    const userMessage: ChatMessageItem = {
      id: crypto.randomUUID(),
      role: "user",
      text: draft,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setDraft("");
    setIsSending(true);
    setMessages((prev) => [...prev, userMessage]);
    await persistMessage({ role: "user", text: draft });
    await maybeRespond(draft);
    setIsSending(false);
  }, [draft, maybeRespond, persistMessage]);

  const slashCommands = React.useMemo<SlashCommand[]>(() => {
    return Object.entries(scriptSelections)
      .map(([category, scriptId]) => {
        const script = scripts.find((item) => item.id === scriptId);
        if (!script) return null;
        const label = categoryLabelMap[category] ?? script.category;
        return {
          id: category,
          label,
          description: script.name,
          insert: () => insertScriptBody(script.body),
        } satisfies SlashCommand;
      })
      .filter((item): item is SlashCommand => Boolean(item));
  }, [insertScriptBody, scriptSelections, scripts]);

  useHotkeys(
    [
      {
        combo: "mod+j",
        handler: () => {
          const recommended = determineNextScript();
          if (recommended) {
            insertScriptBody(recommended);
          }
        },
      },
    ],
    [determineNextScript, insertScriptBody]
  );

  const resetThread = React.useCallback(() => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    toast({ title: "Session reset", description: "Started a fresh DM conversation." });
  }, [toast]);

  const handleDragStart = React.useCallback((category: string, scriptId: string) => {
    return (event: React.DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.setData("text/plain", JSON.stringify({ category, scriptId }));
    };
  }, []);

  const handleDrop = React.useCallback(
    (category: string, targetId: string) => {
      return (event: React.DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const data = event.dataTransfer.getData("text/plain");
        if (!data) return;
        const parsed = JSON.parse(data) as { category: string; scriptId: string };
        if (parsed.category !== category) return;
        setScriptOrder((prev) => {
          const next = { ...prev };
          const order = [...(next[category] ?? [])];
          const fromIndex = order.indexOf(parsed.scriptId);
          const toIndex = order.indexOf(targetId);
          if (fromIndex === -1 || toIndex === -1) return prev;
          order.splice(fromIndex, 1);
          order.splice(toIndex, 0, parsed.scriptId);
          next[category] = order;
          return next;
        });
      };
    },
    [setScriptOrder]
  );

  const allowDrop = React.useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
  }, []);

  const orderedScripts = React.useMemo(() => {
    return scriptGroups.map((group) => {
      const order = scriptOrder[group.category] ?? group.items.map((item) => item.id);
      const items = order
        .map((id) => group.items.find((item) => item.id === id))
        .filter((item): item is Script => Boolean(item));
      return { category: group.category, items } satisfies ScriptGroup;
    });
  }, [scriptGroups, scriptOrder]);

  const commands = slashCommands;

  const stageSummary = inspector.stage ? inspector.stage.toUpperCase() : "Idle";
  const nextStageSummary = inspector.next ? inspector.next.toUpperCase() : "Complete";
  const recommendedScriptName = inspector.next
    ? (() => {
        const categoryKey = stageCategoryMap[inspector.next];
        const scriptId = scriptSelections[categoryKey];
        return scripts.find((item) => item.id === scriptId)?.name ?? "None";
      })()
    : "All stages complete";
  const intentDisplay = intentDisplayMap[inspector.intent];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr_260px]">
      <aside className="glass-panel flex flex-col gap-4 rounded-2xl border p-4 shadow-subtle">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Campaign</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetThread} title="Reset session">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Select value={selectedCampaign?.id ?? undefined} onValueChange={(value) => setSelectedCampaignId(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name} (DM "{campaign.keyword}")
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Product</h3>
          <Select value={selectedProduct?.id ?? undefined} onValueChange={(value) => setSelectedProductId(value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.title} – {formatCurrencyFromCents(product.priceCents)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Scripts</h3>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orderedScripts.map((group) => (
                <SelectItem key={group.category} value={group.category}>
                  {group.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-[320px] rounded-xl border bg-muted/40 p-2">
          <div className="space-y-2">
            {orderedScripts
              .find((group) => group.category === activeCategory)?.items.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  draggable
                  onDragStart={handleDragStart(activeCategory, script.id)}
                  onDragOver={allowDrop}
                  onDrop={handleDrop(activeCategory, script.id)}
                  onClick={() => setScriptSelections((prev) => ({ ...prev, [activeCategory]: script.id }))}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    scriptSelections[activeCategory] === script.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-background hover:border-border"
                  )}
                >
                  <p className="text-sm font-medium">{script.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{script.body}</p>
                </button>
              )) ?? (
              <p className="text-xs text-muted-foreground">No scripts for this category.</p>
            )}
          </div>
        </ScrollArea>
        <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Variables</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <VariableChip label={`{{product}} → ${replacements.product}`} />
            <VariableChip label={`{{price}} → ${replacements.price}`} />
            <VariableChip label={`{{keyword}} → ${replacements.keyword}`} />
          </div>
        </div>
      </aside>

      <section className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-background p-4 shadow-subtle">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Conversation</h3>
              <p className="text-xs text-muted-foreground">Automation nudges appear as the assistant responds.</p>
            </div>
            {isTyping ? <span className="text-xs text-muted-foreground">Assistant is typing…</span> : null}
          </div>
          <div className="mt-4">
            <ChatWindow messages={messages} />
          </div>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-subtle">
          <ChatInput value={draft} onChange={setDraft} onSubmit={handleSend} commands={commands} isSending={isSending} />
        </div>
      </section>

      <aside className="glass-panel flex flex-col gap-4 rounded-2xl border p-4 shadow-subtle">
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">State machine</h3>
          <div className="mt-2 rounded-xl border bg-background p-4">
            <p className="text-xs text-muted-foreground">Current stage</p>
            <p className="text-lg font-semibold">{stageSummary}</p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p>Campaign keyword: <span className="font-medium text-foreground">{replacements.keyword}</span></p>
              <p>Next stage: <span className="font-medium text-foreground">{nextStageSummary}</span></p>
              <p>Recommended script: <span className="font-medium text-foreground">{recommendedScriptName}</span></p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Intent signals</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <IntentBadge label={intentDisplay.label} tone={intentDisplay.tone} />
            {inspector.next ? <IntentBadge label={`Next: ${inspector.next}`} tone="positive" /> : null}
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm font-medium">Need to test checkout?</p>
          <p className="text-xs text-muted-foreground">
            Jump to Products and run the fake checkout to experience fulfillment.
          </p>
          <Button
            className="mt-3 w-full gap-2"
            onClick={() => window.dispatchEvent(new CustomEvent("dm-open-checkout"))}
          >
            <Plus className="h-4 w-4" /> Open Checkout
          </Button>
        </div>
        <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Shortcuts</p>
          <ul className="mt-2 space-y-1">
            <li><strong>/</strong> – insert script</li>
            <li><strong>⌘ + J</strong> – recommended script</li>
            <li><strong>Shift + Enter</strong> – new line</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function groupScripts(items: Script[]): ScriptGroup[] {
  const map = new Map<string, Script[]>();
  for (const script of items) {
    map.set(script.category, [...(map.get(script.category) ?? []), script]);
  }
  return Array.from(map.entries()).map(([category, scripts]) => ({ category, items: scripts }));
}

function buildInspectorState(messages: ChatMessageItem[], keyword: string): InspectorState {
  const progress = getStageProgress(messages);
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
  return {
    stage: progress.lastStage,
    next: computeNextStage(progress.completed),
    intent: evaluateIntent(lastUserMessage, keyword),
  };
}

function getStageProgress(messages: ChatMessageItem[]) {
  const completed = new Set<DMFlowStage>();
  let lastStage: DMFlowStage | undefined;
  for (const message of messages) {
    if (message.stage) {
      completed.add(message.stage);
      lastStage = message.stage;
    }
  }
  return { completed, lastStage };
}

function computeNextStage(completed: Set<DMFlowStage>) {
  for (const stage of stageOrder) {
    if (!completed.has(stage)) {
      return stage;
    }
  }
  return undefined;
}

function evaluateIntent(message: string, keyword: string): InspectorState["intent"] {
  const normalized = message.toLowerCase();
  if (!normalized.trim()) return "neutral";
  if (keyword && normalized.includes(keyword.toLowerCase())) return "keyword";
  if (purchaseSignals.some((signal) => normalized.includes(signal))) return "purchase";
  if (checkoutSignals.some((signal) => normalized.includes(signal))) return "checkout";
  if (objectionSignals.some((signal) => normalized.includes(signal))) return "objection";
  if (interestSignals.some((signal) => normalized.includes(signal))) return "interest";
  return "neutral";
}
