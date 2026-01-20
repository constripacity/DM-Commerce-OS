import { cn } from "@/lib/utils";

const badgeVariants = {
  default:
    "inline-flex items-center rounded-full border border-transparent bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground",
  secondary:
    "inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground",
  outline: "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold",
};

type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <div className={cn(badgeVariants[variant], className)} {...props} />;
}
