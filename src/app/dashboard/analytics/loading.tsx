import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-[250px] w-full rounded-lg" />
      </div>
    </div>
  );
}
