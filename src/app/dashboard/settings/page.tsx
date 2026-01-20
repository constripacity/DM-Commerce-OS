import { SettingsTab } from "@/components/dashboard/settings-tab";
import { SectionHeader } from "@/components/dashboard/section-header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await prisma.setting.findUnique({ where: { id: 1 } });

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Settings"
        title="Brand polish & resets"
        description="Adjust palettes, reset demo data, and keep your sandbox in sync with production conventions."
      />
      <SettingsTab initialData={settings} />
    </div>
  );
}
