import { format } from "date-fns";
import {
  Activity,
  ChevronRight,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";

import { prisma } from "@/lib/db";
import { getAnalyticsData } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Stat Card (inline — matches Dark Premium spec)                    */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}) {
  return (
    <div className="group relative rounded-xl border border-border/50 bg-card/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">
      {/* gradient top border */}
      <div
        className={`absolute inset-x-0 top-0 h-[2px] rounded-t-xl ${gradient}`}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/70">
            {label}
          </p>
          <p className="text-3xl font-mono font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section card wrapper                                              */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data-fetching & page                                              */
/* ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardOverviewPage() {
  const now = new Date();
  const [productsCount, activeCampaignsCount, latestOrders, campaigns, analytics] = await Promise.all([
    prisma.product.count(),
    prisma.campaign.count({
      where: { startsOn: { lte: now }, endsOn: { gte: now } },
    }),
    prisma.order.findMany({ include: { product: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.campaign.findMany({ orderBy: { startsOn: "asc" }, take: 4 }),
    getAnalyticsData(),
  ]);

  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-8">
      {/* ── Welcome header ────────────────────────────────────── */}
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{today}</p>
      </header>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Products"
          value={productsCount.toString()}
          description="Local digital offers"
          icon={Sparkles}
          gradient="bg-gradient-to-r from-orange-500 to-amber-500"
        />
        <StatCard
          label="Active Campaigns"
          value={activeCampaignsCount.toString()}
          description="Inside their run window"
          icon={Rocket}
          gradient="bg-gradient-to-r from-orange-500 to-amber-500"
        />
        <StatCard
          label="7-day Orders"
          value={analytics.totals.orders.toString()}
          description={`${analytics.totals.customers} unique customers`}
          icon={Activity}
          gradient="bg-gradient-to-r from-orange-500 to-amber-500"
        />
        <StatCard
          label="Revenue"
          value={`$${(analytics.totals.revenueCents / 100).toFixed(2)}`}
          description="Simulated, event-attributed"
          icon={Target}
          gradient="bg-gradient-to-r from-orange-500 to-amber-500"
        />
      </section>

      {/* ── Recent orders + event-backed revenue ──────────────── */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionCard
            title="Revenue Over Time"
            action={
              <Link
                href="/dashboard/analytics"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View Details <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            <div className="flex h-56 items-end gap-3" aria-label="Seven-day revenue chart">
              {analytics.chart.map((point) => {
                const maximum = Math.max(...analytics.chart.map((entry) => entry.revenueCents), 1);
                const height = point.revenueCents ? Math.max(8, (point.revenueCents / maximum) * 100) : 2;
                return (
                  <div key={point.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2 text-center">
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      ${(point.revenueCents / 100).toFixed(0)}
                    </span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-orange-600 to-amber-400"
                      style={{ height: `${height}%` }}
                      title={`${point.date}: $${(point.revenueCents / 100).toFixed(2)}`}
                    />
                    <span className="text-[10px] text-muted-foreground">{point.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* Recent orders — col-span-2 */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Orders"
            action={
              <Link
                href="/dashboard/orders"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {latestOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
                <Package className="h-6 w-6 text-muted-foreground/40" />
                No orders yet. Run the checkout demo to see fulfillment.
              </div>
            ) : (
              <div className="space-y-3">
                {latestOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.buyerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.product.title}
                      </p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold">
                        ${(order.totalCents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      {/* ── Active campaigns + Quick actions ──────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Campaigns */}
        <SectionCard
          title="Active Campaigns"
          action={
            <Link
              href="/dashboard/campaigns"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          }
        >
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              <Rocket className="h-6 w-6 text-muted-foreground/40" />
              No campaigns scheduled. Create one to simulate DM triggers.
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const now = new Date();
                const start = new Date(campaign.startsOn);
                const end = new Date(campaign.endsOn);
                const status =
                  now < start
                    ? "Scheduled"
                    : now > end
                      ? "Completed"
                      : "Active";
                const dotColor =
                  status === "Active"
                    ? "bg-emerald-500"
                    : status === "Scheduled"
                      ? "bg-amber-500"
                      : "bg-muted-foreground/50";

                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {campaign.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(start, "MMM d")} &ndash;{" "}
                          {format(end, "MMM d")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="ml-3 shrink-0 rounded-full text-[10px]"
                    >
                      {campaign.keyword}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Quick Actions — 2x2 grid */}
        <SectionCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "New Campaign",
                icon: Rocket,
                href: "/dashboard/campaigns",
              },
              {
                label: "Add Product",
                icon: Plus,
                href: "/dashboard/products",
              },
              {
                label: "DM Studio",
                icon: MessageSquare,
                href: "/dashboard/dm-studio",
              },
              {
                label: "Analytics",
                icon: Activity,
                href: "/dashboard/analytics",
              },
            ].map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                asChild
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
              >
                <Link href={action.href as Route}>
                  <action.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
