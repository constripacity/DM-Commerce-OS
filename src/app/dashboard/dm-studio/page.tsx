"use client";

import { DMStudioTab } from "@/components/dashboard/dm-studio-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function DMStudioPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="DM Studio"
        title="Simulate conversations in real time"
        description="Test scripts, map responses, and validate your state machine before anything ships to production."
      />
      <DMStudioTab />
    </div>
  );
}
