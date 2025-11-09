"use client";

import { ProductsTab } from "@/components/dashboard/products-tab";
import { SectionHeader } from "@/components/dashboard/section-header";

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Products"
        title="Offers ready for DM delivery"
        description="Package digital files, tune pricing, and preview the entire checkout-to-delivery experience."
      />
      <ProductsTab />
    </div>
  );
}
