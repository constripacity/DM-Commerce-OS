import { addDays, eachDayOfInterval, format } from "date-fns";
import { prisma } from "@/lib/db";

export interface FunnelMetric {
  label: string;
  value: number | string;
  delta: string;
}

export interface ChartPoint {
  date: string;
  impressions: number;
  dms: number;
  orders: number;
}

export interface ProductSlice {
  name: string;
  orders: number;
  revenueCents: number;
}

export interface AnalyticsResponse {
  funnel: FunnelMetric[];
  totals: {
    orders: number;
    revenueCents: number;
    avgOrderValueCents: number;
  };
  chart: ChartPoint[];
  productMix: ProductSlice[];
}

export const funnelBaseline = {
  impressions: 18240,
  postCtr: 4.7,
  dms: 710,
  qualified: 218,
};

export const funnelDelta = {
  impressions: "+6.2%",
  postCtr: "+0.4pt",
  dms: "+5.1%",
  qualified: "+3.3%",
};

export const weeklyTrendSeed = [
  { impressions: 2400, dms: 92 },
  { impressions: 2560, dms: 96 },
  { impressions: 2680, dms: 101 },
  { impressions: 2500, dms: 94 },
  { impressions: 2725, dms: 105 },
  { impressions: 2610, dms: 98 },
  { impressions: 2750, dms: 108 },
];

export async function getAnalyticsData() {
  const orders = await prisma.order.findMany({
    include: { product: true },
  });

  const totalRevenueCents = orders.reduce(
    (sum, order) => sum + order.product.priceCents,
    0
  );
  const ordersCount = orders.length;

  const start = addDays(new Date(), -6);
  const days = eachDayOfInterval({ start, end: new Date() });
  const countsByDay = orders.reduce<Record<string, number>>((acc, order) => {
    const key = format(order.createdAt, "yyyy-MM-dd");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const chart = days.map((date, index) => {
    const key = format(date, "yyyy-MM-dd");
    const seed =
      weeklyTrendSeed[index] ??
      weeklyTrendSeed[weeklyTrendSeed.length - 1];
    return {
      date: key,
      impressions: seed.impressions,
      dms: seed.dms,
      orders: countsByDay[key] ?? 0,
    };
  });

  const conversionRate =
    ordersCount && funnelBaseline.dms
      ? (ordersCount / funnelBaseline.dms) * 100
      : 0;
  const avgOrderValueCents = ordersCount
    ? Math.round(totalRevenueCents / ordersCount)
    : 0;

  const funnel = [
    {
      label: "Impressions",
      value: funnelBaseline.impressions,
      delta: funnelDelta.impressions,
    },
    {
      label: "Post CTR",
      value: `${funnelBaseline.postCtr.toFixed(1)}%`,
      delta: funnelDelta.postCtr,
    },
    {
      label: "DM conversations",
      value: funnelBaseline.dms,
      delta: funnelDelta.dms,
    },
    {
      label: "Qualified leads",
      value: funnelBaseline.qualified,
      delta: funnelDelta.qualified,
    },
    {
      label: "Orders",
      value: ordersCount,
      delta: ordersCount ? "+12 orders" : "Flat",
    },
    {
      label: "Conversion rate",
      value: `${conversionRate.toFixed(1)}%`,
      delta: ordersCount ? "+0.3pt" : "Flat",
    },
  ];

  const totals = {
    orders: ordersCount,
    revenueCents: totalRevenueCents,
    avgOrderValueCents,
  };

  const productMixMap = orders.reduce<
    Record<string, { count: number; revenue: number }>
  >((acc, order) => {
    const key = order.product.title;
    const entry = acc[key] ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += order.product.priceCents;
    acc[key] = entry;
    return acc;
  }, {});

  const productMix = Object.entries(productMixMap).map(([name, value]) => ({
    name,
    orders: value.count,
    revenueCents: value.revenue,
  }));

  return { funnel, totals, chart, productMix };
}
