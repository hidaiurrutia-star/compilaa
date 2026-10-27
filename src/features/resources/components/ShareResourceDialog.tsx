import { useEffect, useState } from 'react';
import { Share2, UserRound, X } from 'lucide-react';
import type { ResourceWithRelations } from '../../../types/models';
import type { SharePermission } from '../../../lib/supabase/database.types';
import {
  listResourceShares,
  revokeResourceShare,
  shareResourceByEmail,
  type ShareWithUser,
} from '../../../services/resources';
import { getErrorMessage } from '../../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { FormError } from '../../../components/feedback/ErrorState';
import { InlineLoader } from '../../../components/ui/spinner';
import { useToast } from '../../../components/feedback/ToastProvider';

interface ShareResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ResourceWithRelations | null;
  onShared: () => void;
}

export function ShareResourceDialog({ open, onOpenChange, resource, onShared }: ShareResourceDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('read');
  const [shares, setShares] = useState<ShareWithUser[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !resource) return;
    setEmail('');
    setPermission('read');
    setError(null);
    setConfirmRevoke(null);

    let active = true;
    setLoadingShares(true);
    listResourceShares(resource.id)
      .then((data) => {
        if (active) setShares(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError, 'No se pudieron cargar los accesos.'));
      })
      .finally(() => {
        if (active) setLoadingShares(false);
      });

    return () => {
      active = false;
    };
  }, [open, resource]);

  async function handleShare() {
    if (!resource) return;
    setError(null);
    if (!email.trim()) {
      setError('Escribe el correo de la persona.');
      return;
    }
    setSubmitting(true);
    try {
      await shareResourceByEmail(resource.id, email, permission);
      const updated = await listResourceShares(resource.id);
      setShares(updated);
      setEmail('');
      toast({ tone: 'success', title: 'Recurso compartido' });
      onShared();
    } catch (shareError) {
      setError(getErrorMessage(shareError, 'No se pudo compartir el recurso.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(shareId: string) {
    setError(null);
    try {
      await revokeResourceShare(shareId);
      setShares((current) => current.filter((share) => share.id !== shareId));
      setConfirmRevoke(null);
      toast({ tone: 'success', title: 'Acceso retirado' });
      onShared();
    } catch (revokeError) {
      setError(getErrorMessage(revokeError, 'No se pudo retirar el acceso.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange(next) : undefined)}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
            <Share2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>Compartir recurso</DialogTitle>
          <DialogDescription>
            Comparte «{resource?.title ?? 'este recurso'}» con una persona concreta. Solo las cuentas
            registradas en Compila pueden recibirlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <Field label="Correo de la persona" htmlFor="share-email">
              <Input
                id="share-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="compañero@correo.com"
                autoComplete="off"
              />
            </Field>
            <Field label="Permiso" htmlFor="share-permission">
              <Select
                id="share-permission"
                value={permission}
                onChange={(event) => setPermission(event.target.value as SharePermission)}
              >
                <option value="read">Lectura</option>
                <option value="edit">Edición</option>
              </Select>
            </Field>
          </div>

          <Button onClick={handleShare} loading={submitting} className="w-full sm:w-auto">
            Compartir
          </Button>

          <FormError message={error} />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Personas con acceso
            </p>
            {loadingShares ? (
              <InlineLoader label="Cargando accesos…" />
            ) : shares.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                Este recurso todavía no está compartido con nadie.
              </p>
            ) : (
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {share.user?.display_name ?? 'Persona invitada'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {share.permission === 'edit' ? 'Puede editar' : 'Solo lectura'}
                      </p>
                    </div>
                    {confirmRevoke === share.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => void handleRevoke(share.id)}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setConfirmRevoke(null)}
                          aria-label="Cancelar"
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-red-300"
                        onClick={() => setConfirmRevoke(share.id)}
                      >
                        Quitar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
