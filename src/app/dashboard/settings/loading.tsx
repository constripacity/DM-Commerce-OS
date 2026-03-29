import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
