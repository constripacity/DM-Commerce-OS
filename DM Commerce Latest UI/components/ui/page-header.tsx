import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between', className)}
      {...props}
    >
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {item.href ? (
                  <a
                    href={item.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span>{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
