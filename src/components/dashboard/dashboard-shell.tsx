"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Box,
  ChevronLeft,
  ChevronRight,
  LogOut,
  PieChart,
  Megaphone,
  Menu,
  MessagesSquare,
  ScrollText,
  Settings2,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";

import {
  DashboardDataProvider,
  type OrderWithProduct,
  type Product,
} from "@/components/dashboard/dashboard-data-context";
import { CommandKButton } from "@/components/dashboard/quick-actions";
import { useCommandActions } from "@/components/command-palette";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SimulationProvider } from "@/components/simulation/SimulationProvider";
import { FloatingSimButton } from "@/components/simulation/FloatingSimButton";
import { FakeCursor } from "@/components/simulation/FakeCursor";
import { SpotlightOverlay } from "@/components/simulation/SpotlightOverlay";
import { NarratorTooltip } from "@/components/simulation/NarratorTooltip";
import { SimulationHUD } from "@/components/simulation/SimulationHUD";
import { SimulationCompletionModal } from "@/components/simulation/SimulationCompletionModal";

/* ------------------------------------------------------------------ */
/*  Nav structure                                                      */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard", label: "Overview", icon: PieChart },
      { href: "/dashboard/dm-studio", label: "DM Studio", icon: MessagesSquare },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/dashboard/products", label: "Products", icon: Box },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
      { href: "/dashboard/scripts", label: "Scripts", icon: ScrollText },
    ],
  },
  {
    label: "ANALYZE",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

/** Flat list for route warming + command palette registration */
const allNavItems = navGroups.flatMap((g) => g.items);

/* ------------------------------------------------------------------ */
/*  Sidebar content (shared between desktop & mobile sheet)            */
/* ------------------------------------------------------------------ */

function SidebarContent({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* ---- Logo area ---- */}
      <div className={cn("flex items-center gap-3 px-4 py-6", collapsed && "justify-center px-0")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-foreground">
              DM Commerce OS
            </span>
            <span className="text-[11px] text-muted-foreground">Sandbox</span>
          </div>
        )}
      </div>

      {/* ---- Command palette ---- */}
      {!collapsed && (
        <div className="px-3 pb-4">
          <CommandKButton />
        </div>
      )}

      {/* ---- Nav groups ---- */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    data-sim={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-accent/10 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                    )}
                  >
                    {/* Left accent bar for active item */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ---- User section ---- */}
      <div
        className={cn(
          "mt-auto border-t border-border/30 px-3 py-4",
          collapsed && "flex justify-center px-0"
        )}
      >
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-1 flex-col truncate">
              <span className="truncate text-sm font-medium text-foreground">
                Demo User
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                demo@local.test
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Shell                                                    */
/* ------------------------------------------------------------------ */

interface DashboardShellProps {
  children: React.ReactNode;
  initialProducts?: Product[];
  initialOrders?: OrderWithProduct[];
}

export function DashboardShell({
  children,
  initialProducts,
  initialOrders,
}: DashboardShellProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const didWarmRoutes = React.useRef(false);

  /* ---- Command palette registration ---- */
  const navigationActions = React.useMemo(
    () =>
      allNavItems.map((item) => ({
        id: `dashboard-${item.href}`,
        label: item.label,
        section: "Navigate",
        run: () => router.push(item.href as any),
      })),
    [router]
  );

  useCommandActions(navigationActions);

  /* ---- Route warming / prefetch ---- */
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (didWarmRoutes.current) return;
    didWarmRoutes.current = true;

    let cancelled = false;

    const warmRoutes = async () => {
      const currentPath = window.location.pathname;
      const targets = allNavItems
        .map((item) => item.href)
        .filter((href) => href !== currentPath);

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

    const win = window as typeof globalThis;

    if ("requestIdleCallback" in win) {
      const idleId = (win as any).requestIdleCallback(
        () => {
          void warmRoutes();
        },
        { timeout: 1500 }
      );

      return () => {
        cancelled = true;
        (win as any).cancelIdleCallback?.(idleId);
      };
    }

    const timer = setTimeout(() => {
      void warmRoutes();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  /* ---- Derived values ---- */
  const sidebarWidth = sidebarCollapsed ? 64 : 260;

  return (
    <DashboardDataProvider
      initialProducts={initialProducts}
      initialOrders={initialOrders}
    >
      <SimulationProvider>
        <div className="dashboard-theme min-h-screen bg-background text-foreground">
          {/* ---- Mobile header ---- */}
          <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/30 bg-card/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                DM Commerce OS
              </span>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] border-r border-border/30 bg-card p-0"
              >
                <SidebarContent collapsed={false} />
              </SheetContent>
            </Sheet>
          </div>

          {/* ---- Desktop sidebar ---- */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-30 hidden border-r border-border/30 bg-card/50 backdrop-blur-xl transition-[width] duration-200 ease-in-out lg:block"
            )}
            style={{ width: sidebarWidth }}
          >
            <SidebarContent collapsed={sidebarCollapsed} />

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent/10 hover:text-foreground"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </button>
          </aside>

          {/* ---- Main content ---- */}
          <main
            className={cn(
              "min-h-screen transition-all duration-200 ease-in-out",
              sidebarCollapsed ? "lg:pl-[64px]" : "lg:pl-[260px]"
            )}
          >
            {/* Ambient gradient overlay */}
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(255,122,24,0.06),transparent_50%)]" />

            <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-8 pt-[72px] lg:px-10 lg:pt-8">
              {children}
            </div>
          </main>
        </div>

        {/* ---- Simulation overlays (preserved) ---- */}
        <FloatingSimButton />
        <FakeCursor />
        <SpotlightOverlay />
        <NarratorTooltip />
        <SimulationHUD />
        <SimulationCompletionModal />
      </SimulationProvider>
    </DashboardDataProvider>
  );
}

export default DashboardShell;
