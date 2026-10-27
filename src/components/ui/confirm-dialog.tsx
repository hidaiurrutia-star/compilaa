import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { FormError } from '../feedback/ErrorState';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  error,
  onConfirm,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!loading ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <FormError message={error} /> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
