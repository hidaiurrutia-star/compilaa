import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton-shimmer rounded-md opacity-60', className)} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-lg border border-border/60 p-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
