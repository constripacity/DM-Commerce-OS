import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subLabel?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function StatCard({
  label,
  value,
  subLabel,
  icon: Icon,
  trend,
  trendValue,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white/90 border border-orange-50 shadow-soft p-6',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {(subLabel || trendValue) && (
            <div className="mt-2 flex items-center gap-2">
              {trendValue && trend && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'up' && 'text-emerald-600',
                    trend === 'down' && 'text-red-600',
                    trend === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {trendValue}
                </span>
              )}
              {subLabel && (
                <p className="text-xs text-muted-foreground">{subLabel}</p>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
