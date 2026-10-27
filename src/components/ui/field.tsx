import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, optional, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {optional ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(opcional)</span> : null}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
