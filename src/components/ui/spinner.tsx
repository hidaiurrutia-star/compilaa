import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />;
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function InlineLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
