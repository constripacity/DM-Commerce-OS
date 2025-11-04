"use client";

import * as React from "react";
import {
  Box,
  Bot,
  ChartLine,
  Megaphone,
  ScrollText,
  Settings as SettingsIcon,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";
import { DashboardShell, type DashboardTabDefinition } from "@/components/dashboard/dashboard-shell";
import { ProductsTab, type ProductCommandHandles } from "@/components/dashboard/products-tab";
import { DMStudioTab } from "@/components/dashboard/dm-studio-tab";
import { CampaignsTab } from "@/components/dashboard/campaigns-tab";
import { OrdersTab } from "@/components/dashboard/orders-tab";
import { ScriptsTab } from "@/components/dashboard/scripts-tab";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { SettingsTab } from "@/components/dashboard/settings-tab";
import { useCommandActions, useCommandCenter } from "@/components/command-palette";
import { useThemeController } from "@/components/theme-provider";

const tabs: DashboardTabDefinition[] = [
  {
    value: "products",
    label: "Products",
    description: "Offers, price tests, delivery files",
    icon: Box,
  },
  {
    value: "dm-studio",
    label: "DM Studio",
    description: "Simulate replies & flows",
    icon: Bot,
  },
  {
    value: "campaigns",
    label: "Campaigns",
    description: "Calendar, export-ready posts",
    icon: Megaphone,
  },
  {
    value: "orders",
    label: "Orders",
    description: "Checkout log & fulfillment",
    icon: ShoppingBag,
  },
  {
    value: "scripts",
    label: "Scripts",
    description: "Templates & versions",
    icon: ScrollText,
  },
  {
    value: "analytics",
    label: "Analytics",
    description: "Funnel & revenue pulse",
    icon: ChartLine,
  },
  {
    value: "settings",
    label: "Settings",
    description: "Brand theme & resets",
    icon: SettingsIcon,
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = React.useState<string>("products");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const { setOpen } = useCommandCenter();
  const { cycleTheme } = useThemeController();
  const [productCommands, setProductCommands] = React.useState<ProductCommandHandles | null>(null);

  const navigationActions = React.useMemo(
    () =>
      tabs.map((tab) => ({
        id: `nav-${tab.value}`,
        label: `Go to ${tab.label}`,
        section: "Navigate",
        keywords: [tab.label, tab.description],
        icon: React.createElement(tab.icon, { className: "h-4 w-4" }),
        run: () => setActiveTab(tab.value),
      })),
    [setActiveTab]
  );

  const utilityActions = React.useMemo(() => {
    const actions = [
      {
        id: "focus-search",
        label: "Focus dashboard search",
        section: "Global",
        shortcut: ["/"],
        icon: <Sparkles className="h-4 w-4" />,
        run: () => searchRef.current?.focus(),
      },
      {
        id: "toggle-theme",
        label: "Cycle theme palette",
        section: "Global",
        shortcut: ["⌘", "J"],
        icon: <SettingsIcon className="h-4 w-4" />,
        run: () => cycleTheme(),
      },
      {
        id: "open-orders",
        label: "View recent orders",
        section: "Navigate",
        run: () => setActiveTab("orders"),
      },
    ];

    if (productCommands) {
      actions.push(
        {
          id: "create-product",
          label: "Create product",
          section: "Products",
          shortcut: ["⌘", "N"],
          run: () => productCommands.openCreate(),
        },
        {
          id: "checkout-test",
          label: "Run checkout test",
          section: "Products",
          run: () => productCommands.openCheckoutTest(),
        }
      );
    }

    return actions;
  }, [productCommands, cycleTheme, setActiveTab]);

  useCommandActions(navigationActions);
  useCommandActions(utilityActions);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (event: KeyboardEvent) => {
      if ((event.key === "/" || event.key === "s") && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <DashboardDataProvider>
      <DashboardShell
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchRef={searchRef}
        onOpenCommand={() => setOpen(true)}
      >
        {activeTab === "products" ? (
          <ProductsTab onRegisterCommands={setProductCommands} />
        ) : activeTab === "dm-studio" ? (
          <DMStudioTab />
        ) : activeTab === "campaigns" ? (
          <CampaignsTab />
        ) : activeTab === "orders" ? (
          <OrdersTab />
        ) : activeTab === "scripts" ? (
          <ScriptsTab />
        ) : activeTab === "analytics" ? (
          <AnalyticsTab />
        ) : (
          <SettingsTab />
        )}
      </DashboardShell>
    </DashboardDataProvider>
  );
}
