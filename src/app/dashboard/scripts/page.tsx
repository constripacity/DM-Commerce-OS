"use client";

import { ScriptsTab } from "@/components/dashboard/scripts-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function ScriptsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Scripts"
        title="Reusable DM flows"
        description="Author, version, and repurpose the DM scripts that power your demos and campaigns."
      />
      <ScriptsTab />
    </div>
  );
}
