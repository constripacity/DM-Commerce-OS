import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsTab } from "@/components/dashboard/products-tab";
import { DMStudioTab } from "@/components/dashboard/dm-studio-tab";
import { CampaignsTab } from "@/components/dashboard/campaigns-tab";
import { OrdersTab } from "@/components/dashboard/orders-tab";
import { ScriptsTab } from "@/components/dashboard/scripts-tab";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { SettingsTab } from "@/components/dashboard/settings-tab";
import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-context";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Track the entire DM-to-checkout flow, manage your scripts, and run sandboxed campaigns.
        </p>
      </div>
      <DashboardDataProvider>
        <Tabs defaultValue="products">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="dm-studio">DM Studio</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="dm-studio">
            <DMStudioTab />
          </TabsContent>
          <TabsContent value="campaigns">
            <CampaignsTab />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="scripts">
            <ScriptsTab />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </DashboardDataProvider>
    </div>
  );
}
