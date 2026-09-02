"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import { AnalyticsResponse } from "@/lib/analytics";
import { BarChart3, TrendingUp } from "lucide-react";

interface AnalyticsTabProps {
  data: AnalyticsResponse;
}

const COLORS = ["#6366F1", "#22D3EE", "#F97316", "#84CC16", "#F472B6", "#A855F7"];

export function AnalyticsTab({ data }: AnalyticsTabProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleExport = React.useCallback(() => {
    const container = chartRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) {
      toast({ title: "Export failed", description: "Chart not ready.", variant: "destructive" });
      return;
    }
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const image = new Image();
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth;
      canvas.height = svg.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      const downloadBlob = (blob: Blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = "dm-analytics.png";
        link.click();
        URL.revokeObjectURL(blobUrl);
      };
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob);
          } else {
            const dataUrl = canvas.toDataURL("image/png");
            downloadBlob(dataURLToBlob(dataUrl));
          }
        });
      } else {
        const dataUrl = canvas.toDataURL("image/png");
        downloadBlob(dataURLToBlob(dataUrl));
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast({ title: "Export failed", description: "Browser blocked the image conversion.", variant: "destructive" });
    };
    image.src = url;
  }, [toast]);

  const { funnel, totals, chart, productMix, campaignMix } = data;
  const statCards = [
    {
      title: "Orders",
      value: totals.orders.toString(),
      delta: "Last 7 days",
      description: `${totals.customers} unique local customers.`,
    },
    {
      title: "Revenue",
      value: formatCurrencyFromCents(totals.revenueCents),
      delta: "Simulated",
      description: "Order totals recorded by the local ledger.",
    },
    {
      title: "Avg order value",
      value: formatCurrencyFromCents(totals.avgOrderValueCents),
      delta: `${totals.objectionRate.toFixed(1)}% objections`,
      description: "Average ticket in the selected window.",
    },
    {
      title: "Conversion",
      value: String(funnel.find((metric) => metric.label === "Conversion rate")?.value ?? "0%"),
      delta: funnel.find((metric) => metric.label === "Conversion rate")?.delta ?? "",
      description: "Orders divided by DM conversations.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} description={card.description} delta={card.delta} trend="flat" className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm" />
        ))}
      </div>

      {/* Weekly Trend — full width area chart */}
      <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="flex flex-col gap-2 border-b border-border/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Weekly trend</h3>
              <p className="text-xs text-muted-foreground/70">Real simulator events paired with persisted local orders.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="border-border/50"
          >
            Export chart
          </Button>
        </div>
        <div ref={chartRef} className="h-80 px-6 py-4">
          {mounted ? (
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c4b5fd" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c4b5fd" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCheckouts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => Math.round(value).toLocaleString()}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="conversations" stroke="#c4b5fd" fill="url(#colorConversations)" strokeWidth={2} />
                  <Area type="monotone" dataKey="checkouts" stroke="#6366F1" fill="url(#colorCheckouts)" strokeWidth={2} />
                  <Bar dataKey="orders" barSize={28} fill="#22c55e" opacity={0.8} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>

      {/* Product Mix + Funnel Performance — 2-column */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-border/40 px-6 py-5">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Product mix</h3>
              <p className="text-xs text-muted-foreground/70">How orders split across digital offers.</p>
            </div>
          </div>
          <div className="h-80 px-6 py-4">
            {productMix.length && mounted ? (
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value: number) => `${value} orders`}
                      contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    />
                    <Legend />
                    <Pie data={productMix} dataKey="orders" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={4}>
                      {productMix.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No orders yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div className="border-b border-border/40 px-6 py-5">
            <h3 className="text-lg font-semibold">Funnel performance</h3>
            <p className="text-xs text-muted-foreground/70">Every number is derived from the append-only local event ledger.</p>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-1">
            {funnel.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/40 bg-background/40 p-4 transition-colors hover:bg-background/60">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">{metric.label}</p>
                  <Badge variant="outline" className="border-border/50 text-xs">{metric.delta}</Badge>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Observed during the rolling seven-day window.</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
        <div className="border-b border-border/40 px-6 py-5">
          <h3 className="text-lg font-semibold">Campaign attribution</h3>
          <p className="text-xs text-muted-foreground/70">Which DM campaign produced each simulated order and revenue total.</p>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaignMix.length ? campaignMix.map((campaign) => (
            <div key={campaign.name} className="rounded-lg border border-border/40 bg-background/40 p-4">
              <p className="text-sm font-medium">{campaign.name}</p>
              <p className="mt-2 font-mono text-2xl font-bold">{formatCurrencyFromCents(campaign.revenueCents)}</p>
              <p className="text-xs text-muted-foreground">{campaign.orders} {campaign.orders === 1 ? "order" : "orders"}</p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No attributed orders in this window.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function dataURLToBlob(dataUrl: string) {
  const [prefix, base64] = dataUrl.split(",");
  const byteString = atob(base64);
  const mimeMatch = prefix.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const array = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    array[i] = byteString.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}
