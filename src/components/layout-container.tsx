import { cn } from "@/lib/utils";

interface LayoutContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LayoutContainer({ className, ...props }: LayoutContainerProps) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4", className)} {...props} />;
}
