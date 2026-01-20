import { cn } from "@/lib/utils";

export function VariableChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-dashed border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
        className
      )}
    >
      {label}
    </span>
  );
}
