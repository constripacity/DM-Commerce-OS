import type { Metadata } from "next";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";

export const metadata: Metadata = {
  title: "Dashboard | DM Commerce OS",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardAppShell>{children}</DashboardAppShell>;
}
