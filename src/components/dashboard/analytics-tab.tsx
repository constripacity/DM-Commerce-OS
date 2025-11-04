"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { formatCurrencyFromCents } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";

interface FunnelMetric {
  label: string;
  value: number | string;
  delta: string;
}

interface ChartPoint {
  date: string;
  impressions: number;
  dms: number;
  orders: number;
}

interface ProductSlice {
  name: string;
  orders: number;
  revenueCents: number;
}

interface AnalyticsResponse {
  funnel: FunnelMetric[];
  totals: {
    orders: number;
    revenueCents: number;
    avgOrderValueCents: number;
  };
  chart: ChartPoint[];
  productMix: ProductSlice[];
}

const COLORS = ["#6366F1", "#22D3EE", "#F97316", "#84CC16", "#F472B6", "#A855F7"];

export function AnalyticsTab() {
  const { toast } = useToast();
  const [data, setData] = React.useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await fetch("/api/analytics", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const payload = (await res.json()) as AnalyticsResponse;
        setData(payload);
      } catch (error) {
        toast({
          title: "Unable to load analytics",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [toast]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading analytics</CardTitle>
            <CardDescription>Preparing charts and funnel metrics…</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics unavailable</CardTitle>
          <CardDescription>Try refreshing the page to reload the data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { funnel, totals, chart, productMix } = data;
  const statCards = [
    {
      title: "Orders",
      value: totals.orders.toString(),
      delta: `Last 7 days`,
      description: "Unique checkouts captured.",
    },
    {
      title: "Revenue",
      value: formatCurrencyFromCents(totals.revenueCents),
      delta: "Sandbox",
      description: "Fake revenue generated by flows.",
    },
    {
      title: "Avg order value",
      value: formatCurrencyFromCents(totals.avgOrderValueCents),
      delta: "Blended",
      description: "Average ticket from all orders.",
    },
    {
      title: "Conversion",
      value: funnel.find((metric) => metric.label === "Conversion rate")?.value ?? "0%",
      delta: funnel.find((metric) => metric.label === "Conversion rate")?.delta ?? "",
      description: "Orders divided by DM conversations.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} title={card.title} value={card.value} description={card.description} delta={card.delta} trend="flat" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Weekly trend</CardTitle>
              <CardDescription>Impressions and DM volume paired with new orders.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export chart
            </Button>
          </CardHeader>
          <CardContent ref={chartRef} className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c4b5fd" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#c4b5fd" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} />
                <YAxis />
                <Tooltip formatter={(value: number) => Math.round(value).toLocaleString()} />
                <Legend />
                <Area type="monotone" dataKey="impressions" stroke="#c4b5fd" fill="url(#colorImpressions)" strokeWidth={2} />
                <Area type="monotone" dataKey="dms" stroke="#6366F1" fill="url(#colorDms)" strokeWidth={2} />
                <Bar dataKey="orders" barSize={28} fill="#22c55e" opacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Product mix</CardTitle>
            <CardDescription>How orders split across digital offers.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {productMix.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value: number) => `${value} orders`} />
                  <Legend />
                  <Pie data={productMix} dataKey="orders" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={4}>
                    {productMix.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No orders yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel performance</CardTitle>
          <CardDescription>Baseline funnel metrics seeded for your sandbox.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {funnel.map((metric) => (
            <div key={metric.label} className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <Badge variant="outline">{metric.delta}</Badge>
              </div>
              <p className="mt-3 text-2xl font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">Synthetic baseline for demo traffic.</p>
            </div>
          ))}
        </CardContent>
      </Card>
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