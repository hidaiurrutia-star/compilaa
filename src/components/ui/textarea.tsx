import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={hasError || undefined}
      className={cn(
        'flex min-h-[96px] w-full resize-y rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50',
        hasError && 'border-destructive focus-visible:border-destructive',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
