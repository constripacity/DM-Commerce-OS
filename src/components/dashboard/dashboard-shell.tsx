"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Box,
  PieChart,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings2,
  ShoppingBag,
  Menu,
} from "lucide-react";

import { DashboardDataProvider, type OrderWithProduct, type Product } from "@/components/dashboard/dashboard-data-context";
import { CommandKButton } from "@/components/dashboard/quick-actions";
import { useCommandActions } from "@/components/command-palette";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: PieChart },
  { href: "/dashboard/products", label: "Products", icon: Box },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/dm-studio", label: "DM Studio", icon: MessagesSquare },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/scripts", label: "Scripts", icon: ScrollText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
];

function SidebarContent() {
  const pathname = usePathname();
  
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-300">DM Commerce OS</p>
        <h1 className="text-2xl font-semibold text-white">Operator Console</h1>
        <p className="text-sm text-slate-300">
          Manage DM flows, offers, analytics and delivery without leaving your local sandbox.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <CommandKButton />
        <div className="text-xs text-slate-300">Demo</div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href as any}
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

      <div className="mt-auto text-xs text-slate-300">
        <p className="mb-2">Quick reset:</p>
        <code className="block rounded bg-white/5 px-2 py-1 text-[11px]">pnpm prisma migrate reset --force</code>
        <code className="mt-1 block rounded bg-white/5 px-2 py-1 text-[11px]">pnpm db:seed</code>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  initialProducts?: Product[];
  initialOrders?: OrderWithProduct[];
}

export function DashboardShell({ children, initialProducts, initialOrders }: DashboardShellProps) {
  const router = useRouter();
  const didWarmRoutes = React.useRef(false);

  const navigationActions = React.useMemo(
    () =>
      navItems.map((item) => ({
        id: `dashboard-${item.href}`,
        label: item.label,
        section: "Navigate",
        run: () => router.push(item.href as any),
      })),
    [router]
  );

  useCommandActions(navigationActions);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (didWarmRoutes.current) return;
    didWarmRoutes.current = true;

    let cancelled = false;

    const warmRoutes = async () => {
      const currentPath = window.location.pathname;
      const targets = navItems.map((item) => item.href).filter((href) => href !== currentPath);

      for (const href of targets) {
        if (cancelled) break;

        router.prefetch(href as any);

        try {
          await fetch(href, {
            method: "HEAD",
            credentials: "include",
          });
        } catch {
          // Warmup is best-effort and should never impact navigation flow.
        }

        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        void warmRoutes();
      }, { timeout: 1500 });

      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(() => {
      void warmRoutes();
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <DashboardDataProvider initialProducts={initialProducts} initialOrders={initialOrders}>
      <div className="dashboard-theme min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row lg:gap-8 lg:px-6 lg:pb-16 lg:pt-10">
          
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="font-semibold text-white">DM Commerce OS</span>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 border-r-white/10 bg-slate-950 p-6 text-slate-100">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden w-full max-w-xs space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_60px_rgba(15,23,42,0.35)] backdrop-blur lg:sticky lg:top-10 lg:block lg:h-[calc(100vh-5rem)]">
            <SidebarContent />
          </aside>

          <main className="flex-1 p-4 pt-0 lg:p-0">
            <div className="min-h-[calc(100vh-5rem)] rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_0_80px_rgba(15,23,42,0.4)] backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardDataProvider>
  );
}

export default DashboardShell;
