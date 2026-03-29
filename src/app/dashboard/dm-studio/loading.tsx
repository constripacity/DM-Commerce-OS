import { Skeleton } from "@/components/ui/skeleton";

export default function DMStudioLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </div>
  );
}
