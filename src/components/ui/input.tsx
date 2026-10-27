import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50',
        hasError && 'border-destructive focus-visible:border-destructive',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
