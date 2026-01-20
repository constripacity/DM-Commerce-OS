import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { SectionHeader } from "@/components/dashboard/section-header";
import { getAnalyticsData } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Analytics"
        title="Funnels & performance"
        description="Visualize DM conversion rates, offer performance, and script friction inside your local sandbox."
      />
      <AnalyticsTab data={data} />
    </div>
  );
}
