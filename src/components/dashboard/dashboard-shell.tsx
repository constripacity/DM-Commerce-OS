"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Box,
  ChartPie,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings2,
  ShoppingBag,
} from "lucide-react";

import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { CommandKButton } from "@/components/dashboard/quick-actions";
import { useCommandActions } from "@/components/command-palette";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: ChartPie },
  { href: "/dashboard/products", label: "Products", icon: Box },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/dm-studio", label: "DM Studio", icon: MessagesSquare },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/scripts", label: "Scripts", icon: ScrollText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navigationActions = React.useMemo(
    () =>
      navItems.map((item) => ({
        id: `dashboard-${item.href}`,
        label: item.label,
        section: "Navigate",
        run: () => router.push(item.href),
      })),
    [router]
  );

  useCommandActions(navigationActions);

  return (
    <DashboardDataProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-10 lg:flex-row">
          <aside className="w-full max-w-xs space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_60px_rgba(15,23,42,0.35)] backdrop-blur lg:sticky lg:top-10 lg:h-[calc(100vh-5rem)]">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-300">DM Commerce OS</p>
              <h1 className="text-2xl font-semibold text-white">Operator Console</h1>
              <p className="text-sm text-slate-300">
                Manage DM flows, offers, analytics and delivery without leaving your local sandbox.
              </p>
            </div>
            <CommandKButton />
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-white/90 text-slate-900 shadow-lg shadow-white/40"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="flex-1">
            <div className="min-h-[calc(100vh-5rem)] rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_0_80px_rgba(15,23,42,0.4)] backdrop-blur">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardDataProvider>
  );
}

export default DashboardShell;
