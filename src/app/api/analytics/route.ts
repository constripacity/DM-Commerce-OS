import { NextResponse } from "next/server";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuthCookie } from "@/lib/auth";
import { funnelBaseline, funnelDelta, weeklyTrendSeed } from "@/lib/analytics";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    include: { product: true },
  });

  const totalRevenueCents = orders.reduce((sum, order) => sum + order.product.priceCents, 0);
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
    const seed = weeklyTrendSeed[index] ?? weeklyTrendSeed[weeklyTrendSeed.length - 1];
    return {
      date: key,
      impressions: seed.impressions,
      dms: seed.dms,
      orders: countsByDay[key] ?? 0,
    };
  });

  const conversionRate = ordersCount && funnelBaseline.dms ? (ordersCount / funnelBaseline.dms) * 100 : 0;
  const avgOrderValueCents = ordersCount ? Math.round(totalRevenueCents / ordersCount) : 0;

  const funnel = [
    { label: "Impressions", value: funnelBaseline.impressions, delta: funnelDelta.impressions },
    { label: "Post CTR", value: `${funnelBaseline.postCtr.toFixed(1)}%`, delta: funnelDelta.postCtr },
    { label: "DM conversations", value: funnelBaseline.dms, delta: funnelDelta.dms },
    { label: "Qualified leads", value: funnelBaseline.qualified, delta: funnelDelta.qualified },
    { label: "Orders", value: ordersCount, delta: ordersCount ? "+12 orders" : "Flat" },
    { label: "Conversion rate", value: `${conversionRate.toFixed(1)}%`, delta: ordersCount ? "+0.3pt" : "Flat" },
  ];

  const totals = {
    orders: ordersCount,
    revenueCents: totalRevenueCents,
    avgOrderValueCents,
  };

  return NextResponse.json({ funnel, totals, chart });
}
