import { addDays, eachDayOfInterval, format, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { commerceEventTypes, decodeEventProperties } from "@/lib/events";

export interface FunnelMetric {
  label: string;
  value: number | string;
  delta: string;
}

export interface ChartPoint {
  date: string;
  conversations: number;
  checkouts: number;
  orders: number;
  revenueCents: number;
}

export interface ProductSlice {
  name: string;
  orders: number;
  revenueCents: number;
}

export interface CampaignSlice {
  name: string;
  orders: number;
  revenueCents: number;
}

export interface AnalyticsResponse {
  window: { from: string; to: string; days: number };
  funnel: FunnelMetric[];
  totals: {
    orders: number;
    customers: number;
    revenueCents: number;
    avgOrderValueCents: number;
    objectionRate: number;
    medianTimeToCheckoutSeconds: number | null;
  };
  chart: ChartPoint[];
  productMix: ProductSlice[];
  campaignMix: CampaignSlice[];
}

function distinctSessions(events: Array<{ sessionId: string | null }>) {
  return new Set(events.flatMap((event) => (event.sessionId ? [event.sessionId] : [])));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export async function getAnalyticsData(): Promise<AnalyticsResponse> {
  const end = new Date();
  const start = startOfDay(addDays(end, -6));
  const [orders, events, customerCount] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { product: true, campaign: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.commerceEvent.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customer.count({
      where: { orders: { some: { createdAt: { gte: start, lte: end } } } },
    }),
  ]);

  const conversations = distinctSessions(
    events.filter((event) => event.type === commerceEventTypes.conversationStarted),
  );
  const qualified = distinctSessions(
    events.filter((event) => {
      if (event.type !== commerceEventTypes.flowStageReached) return false;
      return decodeEventProperties(event.propertiesJson).stage === "qualify";
    }),
  );
  const checkoutSessions = distinctSessions(
    events.filter((event) => event.type === commerceEventTypes.checkoutStarted),
  );
  const objectionSessions = distinctSessions(
    events.filter((event) => event.type === commerceEventTypes.objectionRaised),
  );
  const convertedConversationSessions = new Set(
    orders.flatMap((order) =>
      order.sessionId && conversations.has(order.sessionId) ? [order.sessionId] : [],
    ),
  );
  const deliveredOrders = new Set(
    events
      .filter((event) => event.type === commerceEventTypes.deliveryCompleted)
      .flatMap((event) => (event.orderId ? [event.orderId] : [])),
  );

  const totalRevenueCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const conversionRate = conversations.size
    ? (convertedConversationSessions.size / conversations.size) * 100
    : 0;
  const objectionRate = conversations.size
    ? (objectionSessions.size / conversations.size) * 100
    : 0;

  const firstConversationBySession = new Map<string, Date>();
  const firstCheckoutBySession = new Map<string, Date>();
  for (const event of events) {
    if (!event.sessionId) continue;
    if (
      event.type === commerceEventTypes.conversationStarted &&
      !firstConversationBySession.has(event.sessionId)
    ) {
      firstConversationBySession.set(event.sessionId, event.createdAt);
    }
    if (
      event.type === commerceEventTypes.checkoutStarted &&
      !firstCheckoutBySession.has(event.sessionId)
    ) {
      firstCheckoutBySession.set(event.sessionId, event.createdAt);
    }
  }
  const checkoutDurations = Array.from(firstCheckoutBySession.entries()).flatMap(
    ([sessionId, checkoutAt]) => {
      const startedAt = firstConversationBySession.get(sessionId);
      if (!startedAt || checkoutAt < startedAt) return [];
      return [Math.round((checkoutAt.getTime() - startedAt.getTime()) / 1000)];
    },
  );

  const days = eachDayOfInterval({ start, end });
  const chart = days.map((date) => {
    const key = format(date, "yyyy-MM-dd");
    const dayOrders = orders.filter(
      (order) => format(order.createdAt, "yyyy-MM-dd") === key,
    );
    return {
      date: key,
      conversations: distinctSessions(
        events.filter(
          (event) =>
            event.type === commerceEventTypes.conversationStarted &&
            format(event.createdAt, "yyyy-MM-dd") === key,
        ),
      ).size,
      checkouts: events.filter(
        (event) =>
          event.type === commerceEventTypes.checkoutStarted &&
          format(event.createdAt, "yyyy-MM-dd") === key,
      ).length,
      orders: dayOrders.length,
      revenueCents: dayOrders.reduce((sum, order) => sum + order.totalCents, 0),
    };
  });

  const productMixMap = new Map<string, { orders: number; revenueCents: number }>();
  const campaignMixMap = new Map<string, { orders: number; revenueCents: number }>();
  for (const order of orders) {
    const productEntry = productMixMap.get(order.product.title) ?? {
      orders: 0,
      revenueCents: 0,
    };
    productEntry.orders += 1;
    productEntry.revenueCents += order.totalCents;
    productMixMap.set(order.product.title, productEntry);

    const campaignName = order.campaign?.name ?? "Unattributed";
    const campaignEntry = campaignMixMap.get(campaignName) ?? {
      orders: 0,
      revenueCents: 0,
    };
    campaignEntry.orders += 1;
    campaignEntry.revenueCents += order.totalCents;
    campaignMixMap.set(campaignName, campaignEntry);
  }

  return {
    window: { from: start.toISOString(), to: end.toISOString(), days: 7 },
    funnel: [
      { label: "Conversations", value: conversations.size, delta: "event-backed" },
      { label: "Qualified leads", value: qualified.size, delta: "flow stage" },
      { label: "Checkout starts", value: checkoutSessions.size, delta: "local handoff" },
      { label: "Orders", value: orders.length, delta: "persisted" },
      { label: "Delivered", value: deliveredOrders.size, delta: "verified asset" },
      { label: "Conversion rate", value: `${conversionRate.toFixed(1)}%`, delta: "orders / DMs" },
    ],
    totals: {
      orders: orders.length,
      customers: customerCount,
      revenueCents: totalRevenueCents,
      avgOrderValueCents: orders.length ? Math.round(totalRevenueCents / orders.length) : 0,
      objectionRate,
      medianTimeToCheckoutSeconds: median(checkoutDurations),
    },
    chart,
    productMix: Array.from(productMixMap, ([name, value]) => ({ name, ...value })),
    campaignMix: Array.from(campaignMixMap, ([name, value]) => ({ name, ...value })),
  };
}
