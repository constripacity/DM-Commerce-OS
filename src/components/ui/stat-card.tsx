import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  description?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, delta, trend = "flat", description, icon, footer, className }: StatCardProps) {
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";
  const trendSymbol = trend === "up" ? "▲" : trend === "down" ? "▼" : "■";

  return (
    <div className={cn("glass-panel relative flex flex-col gap-3 rounded-xl border px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {delta ? (
        <div className={cn("text-xs font-medium", trendColor)}>
          {trendSymbol} {delta}
        </div>
      ) : null}
      {footer ? <div className="pt-2 text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
