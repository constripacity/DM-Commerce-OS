"use client";

import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Analytics"
        title="Funnels & performance"
        description="Visualize DM conversion rates, offer performance, and script friction inside your local sandbox."
      />
      <AnalyticsTab />
    </div>
  );
}
