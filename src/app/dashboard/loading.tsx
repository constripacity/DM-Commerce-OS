import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 bg-white/10" />
            <Skeleton className="h-10 w-96 bg-white/10" />
            <Skeleton className="h-4 w-full max-w-2xl bg-white/10" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-40 rounded-full bg-white/10" />
            <Skeleton className="h-10 w-40 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 bg-white/10" />
                <Skeleton className="h-8 w-12 bg-white/10" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-3/4 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <Skeleton className="h-6 w-40 bg-white/10" />
            <Skeleton className="h-4 w-64 bg-white/10" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl bg-white/10" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <Skeleton className="h-6 w-40 bg-white/10" />
            <Skeleton className="h-4 w-64 bg-white/10" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/10" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
