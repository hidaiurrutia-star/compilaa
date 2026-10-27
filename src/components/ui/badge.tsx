import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border bg-secondary text-secondary-foreground',
        accent: 'border-primary/25 bg-primary/10 text-primary',
        success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
        danger: 'border-destructive/30 bg-destructive/10 text-red-300',
        outline: 'border-border text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
