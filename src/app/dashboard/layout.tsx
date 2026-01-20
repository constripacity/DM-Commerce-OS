import type { Metadata } from "next";
import { prisma } from "@/lib/db";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | DM Commerce OS",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [products, orders] = await Promise.all([
    prisma.product.findMany(),
    prisma.order.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return <DashboardShell initialProducts={products} initialOrders={orders}>{children}</DashboardShell>;
}
