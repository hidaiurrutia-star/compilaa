import { AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'No pudimos cargar esto', message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center',
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
