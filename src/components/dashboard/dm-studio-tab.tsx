"use client";

import * as React from "react";
import type { Campaign, Script } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { checkoutSchema } from "@/lib/validators";
import type { DMFlowMessage, DMFlowStage } from "@/lib/stateMachines/dmFlow";
import { attachStageMarker, fillTemplate, getNextAutoReply, parseStageFromText } from "@/lib/stateMachines/dmFlow";
import { formatCurrencyFromCents } from "@/lib/format";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  stage?: DMFlowStage;
  createdAt: string;
}

type CheckoutFormValues = {
  buyerName: string;
  buyerEmail: string;
};

const checkoutFormSchema = checkoutSchema.omit({ productId: true });

const scriptStages = ["pitch", "qualify", "checkout", "delivery", "objections"] as const;

function groupScripts(scripts: Script[]) {
  return scripts.reduce<Record<string, Script[]>>((acc, script) => {
    const category = script.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(script);
    return acc;
  }, {});
}

export function DMStudioTab() {
  const { products, reloadOrders } = useDashboardData();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sessionId, setSessionId] = React.useState(() => crypto.randomUUID());
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);
  const [selectedScriptIds, setSelectedScriptIds] = React.useState<Record<string, string | undefined>>({});
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);
  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { buyerName: "", buyerEmail: "" },
  });
  const endRef = React.useRef<HTMLDivElement>(null);

  const scriptGroups = React.useMemo(() => groupScripts(scripts), [scripts]);
  const campaignLookup = React.useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns]);
  const scriptLookup = React.useMemo(() => new Map(scripts.map((script) => [script.id, script])), [scripts]);
  const productLookup = React.useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  React.useEffect(() => {
    async function loadLibrary() {
      try {
        const [campaignRes, scriptRes] = await Promise.all([fetch("/api/campaigns"), fetch("/api/scripts")]);
        if (!campaignRes.ok || !scriptRes.ok) {
          throw new Error("Unable to load DM assets");
        }
        const [campaignData, scriptData] = await Promise.all([campaignRes.json(), scriptRes.json()]);
        setCampaigns(campaignData);
        setScripts(scriptData);
        setSelectedCampaignId((current) => current ?? campaignData[0]?.id ?? null);
      } catch (error) {
        toast({
          title: "Failed to load studio data",
          description: error instanceof Error ? error.message : "Please refresh the page.",
          variant: "destructive",
        });
      }
    }

    loadLibrary();
  }, [toast]);

  React.useEffect(() => {
    if (!selectedProductId && products[0]) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  React.useEffect(() => {
    setSelectedScriptIds((current) => {
      const next = { ...current };
      for (const key of scriptStages) {
        const category = key === "objections" ? "objections" : key;
        if (!next[category]) {
          const first = scriptGroups[category]?.[0];
          if (first) {
            next[category] = first.id;
          }
        }
      }
      return next;
    });
  }, [scriptGroups]);

  React.useEffect(() => {
    async function loadMessages() {
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/messages?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error("Unable to load messages");
        }
        const data = await res.json();
        const parsed: ChatMessage[] = data.map((message: any) => {
          const parsedText = parseStageFromText(message.text);
          return {
            id: message.id,
            role: message.role,
            text: parsedText.text,
            stage: parsedText.stage,
            createdAt: message.createdAt,
          };
        });
        setMessages(parsed);
      } catch (error) {
        toast({
          title: "Failed to load DM thread",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [sessionId, toast]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedCampaign = selectedCampaignId ? campaignLookup.get(selectedCampaignId) : undefined;
  const selectedProduct = selectedProductId ? productLookup.get(selectedProductId) : undefined;

  const selectedScriptsMap = React.useMemo(() => {
    return {
      pitch: selectedScriptIds.pitch ? scriptLookup.get(selectedScriptIds.pitch)?.body : undefined,
      qualify: selectedScriptIds.qualify ? scriptLookup.get(selectedScriptIds.qualify)?.body : undefined,
      checkout: selectedScriptIds.checkout ? scriptLookup.get(selectedScriptIds.checkout)?.body : undefined,
      delivery: selectedScriptIds.delivery ? scriptLookup.get(selectedScriptIds.delivery)?.body : undefined,
      objection: selectedScriptIds.objections ? scriptLookup.get(selectedScriptIds.objections)?.body : undefined,
    };
  }, [scriptLookup, selectedScriptIds]);

  const replacements = React.useMemo(() => {
    return {
      product: selectedProduct?.title ?? "your offer",
      price: selectedProduct ? formatCurrencyFromCents(selectedProduct.priceCents) : "$0",
      keyword: selectedCampaign?.keyword ?? "KEYWORD",
    };
  }, [selectedCampaign?.keyword, selectedProduct]);

  async function persistMessage(message: { role: "user" | "assistant"; text: string; stage?: DMFlowStage }) {
    const payload = {
      sessionId,
      role: message.role,
      text: message.stage ? attachStageMarker(message.text, message.stage) : message.text,
    };
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const saved = await res.json();
    const parsed = parseStageFromText(saved.text);
    const chatMessage: ChatMessage = {
      id: saved.id,
      role: saved.role,
      text: parsed.text,
      stage: parsed.stage,
      createdAt: saved.createdAt,
    };
    setMessages((prev) => [...prev, chatMessage]);
    return chatMessage;
  }

  const handleSend = async () => {
    const value = draft.trim();
    if (!value) return;
    if (!selectedCampaign || !selectedProduct) {
      toast({
        title: "Configure your studio",
        description: "Select a campaign and product to simulate a DM flow.",
        variant: "destructive",
      });
      return;
    }
    setDraft("");

    try {
      const userMessage = await persistMessage({ role: "user", text: value });
      const contextMessages: DMFlowMessage[] = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        text: msg.text,
        stage: msg.stage,
      }));

      const autoReply = getNextAutoReply({
        messages: contextMessages,
        latestUserMessage: userMessage.text,
        keyword: selectedCampaign.keyword,
        scripts: selectedScriptsMap,
        product: { title: selectedProduct.title, priceCents: selectedProduct.priceCents },
      });

      if (autoReply) {
        await persistMessage({ role: "assistant", text: autoReply.text, stage: autoReply.stage });
      }
    } catch (error) {
      toast({
        title: "Unable to send message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const startNewSession = () => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setDraft("");
    setCheckoutOpen(false);
  };

  const openCheckoutModal = () => {
    if (!selectedProduct) {
      toast({
        title: "Select a product",
        description: "Choose which product to deliver before running checkout.",
        variant: "destructive",
      });
      return;
    }
    checkoutForm.reset({ buyerName: "", buyerEmail: "" });
    setCheckoutOpen(true);
  };

  const handleCheckout = async (values: CheckoutFormValues) => {
    if (!selectedProduct) return;
    setCheckoutSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, productId: selectedProduct.id }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await reloadOrders();
      setCheckoutOpen(false);
      toast({
        title: "Checkout simulated",
        description: `${values.buyerName} now has ${selectedProduct.title}.`,
      });
      const purchaseMessage = await persistMessage({
        role: "user",
        text: `Just purchased ${selectedProduct.title}!`,
      });
      const contextMessages: DMFlowMessage[] = [...messages, purchaseMessage].map((msg) => ({
        role: msg.role,
        text: msg.text,
        stage: msg.stage,
      }));
      const autoReply = getNextAutoReply({
        messages: contextMessages,
        latestUserMessage: purchaseMessage.text,
        keyword: selectedCampaign?.keyword ?? "",
        scripts: selectedScriptsMap,
        product: { title: selectedProduct.title, priceCents: selectedProduct.priceCents },
      });
      if (autoReply) {
        await persistMessage({ role: "assistant", text: autoReply.text, stage: autoReply.stage });
      }
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const renderScriptPreview = (body?: string) => {
    if (!body) return "No script selected";
    return fillTemplate(body, replacements);
  };

  const canSend = Boolean(draft.trim()) && !loadingMessages;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">DM Studio Controls</h2>
          <p className="text-sm text-muted-foreground">
            Configure the scenario, drop scripts, and drive the auto-responses.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <FormLabel>Campaign</FormLabel>
            <Select value={selectedCampaignId ?? undefined} onValueChange={setSelectedCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCampaign ? (
              <Badge variant="outline">Keyword: DM {selectedCampaign.keyword}</Badge>
            ) : (
              <p className="text-xs text-muted-foreground">Create a campaign to start the flow.</p>
            )}
          </div>
          <div className="space-y-1">
            <FormLabel>Product</FormLabel>
            <Select value={selectedProductId ?? undefined} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.title} ({formatCurrencyFromCents(product.priceCents)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Script selection</h3>
          {scriptStages.map((stage) => {
            const category = stage === "objections" ? "objections" : stage;
            const label = stage.charAt(0).toUpperCase() + stage.slice(1);
            const scriptsForStage = scriptGroups[category] ?? [];
            const selectedId = selectedScriptIds[category];
            return (
              <div key={stage} className="space-y-2">
                <FormLabel>{label}</FormLabel>
                <Select
                  value={selectedId ?? undefined}
                  onValueChange={(value) =>
                    setSelectedScriptIds((prev) => ({
                      ...prev,
                      [category]: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${label.toLowerCase()} script`} />
                  </SelectTrigger>
                  <SelectContent>
                    {scriptsForStage.map((script) => (
                      <SelectItem key={script.id} value={script.id}>
                        {script.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                  {renderScriptPreview(selectedScriptsMap[category === "objections" ? "objection" : category])}
                </p>
              </div>
            );
          })}
        </div>
        <Separator />
        <Button variant="outline" onClick={startNewSession} className="w-full">
          Start new DM session
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Conversation</h2>
            <p className="text-sm text-muted-foreground">
              Session ID: <span className="font-mono text-xs">{sessionId}</span>
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex h-[420px] flex-col gap-4">
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {loadingMessages ? (
                <p className="text-sm text-muted-foreground">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Say hello with the campaign keyword to kick off the automation.
                </p>
              ) : (
                messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    onCheckoutRequest={openCheckoutModal}
                  />
                ))
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>
          <div className="space-y-2">
            <Textarea
              placeholder="Type a DM…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend) {
                    handleSend();
                  }
                }
              }}
              rows={3}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Auto-replies use the selected scripts with live variables.</span>
              <Button onClick={handleSend} disabled={!canSend}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 space-y-1">
              <h3 className="text-lg font-semibold">Simulate checkout</h3>
              <p className="text-sm text-muted-foreground">
                Record a purchase for {selectedProduct?.title ?? "this product"}.
              </p>
            </div>
            <Form {...checkoutForm}>
              <form className="space-y-4" onSubmit={checkoutForm.handleSubmit(handleCheckout)}>
                <FormField
                  control={checkoutForm.control}
                  name="buyerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer name</FormLabel>
                      <FormControl>
                        <Input placeholder="Taylor Demo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={checkoutForm.control}
                  name="buyerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="taylor@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCheckoutOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={checkoutSubmitting}>
                    {checkoutSubmitting ? "Recording…" : "Complete checkout"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({
  message,
  onCheckoutRequest,
}: {
  message: ChatMessage;
  onCheckoutRequest: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow"
            : "max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm text-foreground shadow"
        }
        data-testid={`dm-message-${message.role}`}
        data-stage={message.stage ?? undefined}
      >
        {message.stage ? (
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            {message.stage}
          </p>
        ) : null}
        <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
        {message.stage === "checkout" ? (
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant={isUser ? "secondary" : "outline"} onClick={onCheckoutRequest}>
              Simulate checkout
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
