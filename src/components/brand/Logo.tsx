import { cn } from '../../lib/utils';

export function Logo({
  size = 'md',
  showName = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}) {
  const box = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const text = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10',
          box,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none">
          <path
            d="M23.5 11.5C21.9 9.3 19.5 8 16.8 8C11.9 8 8 11.9 8 16C8 20.1 11.9 24 16.8 24C19.5 24 21.9 22.7 23.5 20.5"
            stroke="hsl(var(--primary))"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path d="M21 16H14" stroke="hsl(var(--primary))" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </span>
      {showName ? (
        <span className={cn('font-semibold tracking-tight text-foreground', text)}>Compila</span>
      ) : null}
    </span>
  );
}
