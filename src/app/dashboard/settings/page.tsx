"use client";

import { SettingsTab } from "@/components/dashboard/settings-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Settings"
        title="Brand polish & resets"
        description="Adjust palettes, reset demo data, and keep your sandbox in sync with production conventions."
      />
      <SettingsTab />
    </div>
  );
}
