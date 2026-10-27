import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Link2, UserPlus } from 'lucide-react';
import { inviteMemberSchema, type InviteMemberValues } from '../schemas';
import { createInvitation } from '../../../services/invitations';
import { copyTextToClipboard, formatDateTime, getErrorMessage } from '../../../lib/utils';
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
import { useToast } from '../../../components/feedback/ToastProvider';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  onInvited: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  onInvited,
}: InviteMemberDialogProps) {
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<{ url: string; expiresAt: string; email: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'viewer' },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setCreatedLink(null);
    setCopied(false);
    reset({ email: '', role: 'viewer' });
  }, [open, reset]);

  async function onSubmit(values: InviteMemberValues) {
    setFormError(null);
    try {
      const invitation = await createInvitation(spaceId, values.email, values.role);
      setCreatedLink({
        url: invitation.inviteUrl,
        expiresAt: invitation.expiresAt,
        email: values.email.trim().toLowerCase(),
      });
      onInvited();
      toast({ tone: 'success', title: 'Invitación creada' });
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo crear la invitación.'));
    }
  }

  async function handleCopy() {
    if (!createdLink) return;
    const success = await copyTextToClipboard(createdLink.url);
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        tone: 'error',
        title: 'No se pudo copiar',
        description: 'Selecciona el enlace y cópialo manualmente.',
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        if (!next) setCreatedLink(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>Invitar a {spaceName}</DialogTitle>
          <DialogDescription>
            La invitación caduca en 14 días y solo puede usarla la cuenta con ese correo. Comparte el
            enlace por un medio privado.
          </DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Invitación lista para {createdLink.email}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Caduca el {formatDateTime(createdLink.expiresAt)}. Por seguridad, este enlace no se
                podrá volver a mostrar.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  readOnly
                  value={createdLink.url}
                  aria-label="Enlace de invitación"
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Si la persona no tiene cuenta, deberá crearla con el mismo correo antes de abrir el
              enlace.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreatedLink(null);
                  reset({ email: '', role: 'viewer' });
                }}
              >
                Invitar a otra persona
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Correo de la persona" htmlFor="invite-email" error={errors.email?.message}>
              <Input
                id="invite-email"
                type="email"
                placeholder="companero@correo.com"
                hasError={Boolean(errors.email)}
                autoComplete="off"
                {...register('email')}
              />
            </Field>

            <Field label="Rol en el espacio" htmlFor="invite-role" error={errors.role?.message}>
              <Select id="invite-role" {...register('role')}>
                <option value="viewer">Lector · solo consultar</option>
                <option value="editor">Editor · crear y modificar contenido</option>
              </Select>
            </Field>

            <p className="text-xs leading-5 text-muted-foreground">
              El rol de propietario no se puede transferir desde la interfaz.
            </p>

            <FormError message={formError} />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                <UserPlus aria-hidden="true" />
                Crear invitación
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
