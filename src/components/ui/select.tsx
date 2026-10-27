import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          'flex h-10 w-full appearance-none rounded-lg border border-input bg-background/60 px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  ),
);
Select.displayName = 'Select';
