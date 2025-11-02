"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

interface AnalyticsResponse {
  funnel: FunnelMetric[];
  totals: {
    orders: number;
    revenueCents: number;
    avgOrderValueCents: number;
  };
  chart: ChartPoint[];
}

export function AnalyticsTab() {
  const { toast } = useToast();
  const [data, setData] = React.useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await fetch("/api/analytics");
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

  if (loading) {
    return (
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
        <Card className="md:col-span-2 xl:col-span-4">
          <CardHeader>
            <Skeleton className="h-4 w-36" />
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

  const { funnel, totals, chart } = data;
  const maxImpressions = Math.max(...chart.map((point) => point.impressions), 1);
  const maxDms = Math.max(...chart.map((point) => point.dms), 1);
  const maxOrders = Math.max(...chart.map((point) => point.orders), 1);

  const viewBoxWidth = 640;
  const viewBoxHeight = 240;
  const padding = 32;
  const xStep = chart.length > 1 ? (viewBoxWidth - padding * 2) / (chart.length - 1) : 0;

  const impressionsPoints = chart
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = viewBoxHeight - padding - (point.impressions / maxImpressions) * (viewBoxHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const dmPoints = chart
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = viewBoxHeight - padding - (point.dms / maxDms) * (viewBoxHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const orderBars = chart.map((point, index) => {
    const x = padding + index * xStep - 8;
    const height = (point.orders / maxOrders) * (viewBoxHeight - padding * 2);
    const y = viewBoxHeight - padding - height;
    return { x, y, height };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {funnel.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <Badge variant="outline">{metric.delta}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-sm text-muted-foreground">Compared to last 7 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly trend</CardTitle>
            <CardDescription>Impressions and DM volume paired with new orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full">
                <polyline
                  points={impressionsPoints}
                  fill="none"
                  stroke="#c4b5fd"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <polyline
                  points={dmPoints}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {orderBars.map((bar, index) => (
                  <rect
                    key={chart[index]?.date ?? index}
                    x={bar.x}
                    y={bar.y}
                    width={16}
                    height={bar.height}
                    rx={2}
                    fill="#22c55e"
                    opacity={0.7}
                  />
                ))}
              </svg>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-4 rounded-full bg-[#c4b5fd]" /> Impressions
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-4 rounded-full bg-[#6366F1]" /> DMs
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-4 rounded-sm bg-[#22c55e]" /> Orders
                </span>
              </div>
              <div className="mt-4 grid grid-cols-7 text-center text-xs text-muted-foreground">
                {chart.map((point) => (
                  <span key={point.date}>{point.date.slice(5)}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline summary</CardTitle>
            <CardDescription>Snapshot of DM-to-order performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Orders this week</p>
              <p className="text-3xl font-semibold">{totals.orders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-semibold">
                {formatCurrencyFromCents(totals.revenueCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average order value</p>
              <p className="text-2xl font-semibold">
                {totals.avgOrderValueCents
                  ? formatCurrencyFromCents(totals.avgOrderValueCents)
                  : "—"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Metrics blend seeded funnel data with live orders so you can demo progress without external APIs.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
