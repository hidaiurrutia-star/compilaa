import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
