import { cn } from "@/lib/utils";

interface IntentBadgeProps {
  label: string;
  tone?: "positive" | "neutral" | "caution";
  className?: string;
}

export function IntentBadge({ label, tone = "neutral", className }: IntentBadgeProps) {
  const palette = {
    positive: "bg-emerald-100 text-emerald-700 border-emerald-200",
    neutral: "bg-muted text-muted-foreground border-border",
    caution: "bg-amber-100 text-amber-700 border-amber-200",
  }[tone];

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", palette, className)}>
      {label}
    </span>
  );
}
