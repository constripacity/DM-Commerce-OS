"use client";

import { OrdersTab } from "@/components/dashboard/orders-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function OrdersPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Orders"
        title="Checkout transcripts & delivery"
        description="Replay every sandbox checkout, confirm digital fulfillment, and export proof for your flows."
      />
      <OrdersTab />
    </div>
  );
}
