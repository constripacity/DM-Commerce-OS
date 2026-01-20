"use client";

import { CampaignsTab } from "@/components/dashboard/campaigns-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function CampaignsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Campaigns"
        title="Schedule drops & DM triggers"
        description="Orchestrate post calendars, map keywords, and link scripts to campaigns that run entirely offline."
      />
      <CampaignsTab />
    </div>
  );
}
