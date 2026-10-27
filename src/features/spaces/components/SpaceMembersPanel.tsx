import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Mail, ShieldCheck, UserMinus, UserPlus, UsersRound } from 'lucide-react';
import type { MemberWithProfile, SpaceRole } from '../../../types/models';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, canManageMembers } from '../../../lib/permissions';
import { cancelInvitation, listSpaceInvitations } from '../../../services/invitations';
import { leaveSpace, removeMember, updateMemberRole } from '../../../services/spaces';
import { formatDate, getErrorMessage, getInitials } from '../../../lib/utils';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select } from '../../../components/ui/select';
import { Card } from '../../../components/ui/card';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { SkeletonList } from '../../../components/ui/skeleton';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/ToastProvider';
import { InviteMemberDialog } from './InviteMemberDialog';

interface SpaceMembersPanelProps {
  spaceId: string;
  spaceName: string;
  userId: string;
  role: SpaceRole;
  members: MemberWithProfile[];
  onChanged: () => void;
}

export function SpaceMembersPanel({
  spaceId,
  spaceName,
  userId,
  role,
  members,
  onChanged,
}: SpaceMembersPanelProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isOwner = canManageMembers(role);
  const [invitesVersion, setInvitesVersion] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [roleSaving, setRoleSaving] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const invitations = useAsyncData(
    () => listSpaceInvitations(spaceId),
    `space-invitations:${spaceId}:${invitesVersion}`,
    { enabled: isOwner, fallbackError: 'No se pudieron cargar las invitaciones pendientes.' },
  );

  const handleRealtime = useCallback(() => {
    onChanged();
    setInvitesVersion((current) => current + 1);
  }, [onChanged]);

  useRealtimeRefresh(
    [
      { table: 'space_members', filter: `space_id=eq.${spaceId}` },
      { table: 'invitations', filter: `space_id=eq.${spaceId}` },
    ],
    `space-members:${spaceId}`,
    handleRealtime,
    isOwner,
  );

  async function handleRoleChange(member: MemberWithProfile, nextRole: 'editor' | 'viewer') {
    setRoleSaving(member.user_id);
    try {
      await updateMemberRole(spaceId, member.user_id, nextRole);
      toast({ tone: 'success', title: 'Rol actualizado', description: `Ahora es ${ROLE_LABELS[nextRole].toLowerCase()}.` });
      onChanged();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'No se pudo cambiar el rol',
        description: getErrorMessage(error, 'Inténtalo de nuevo.'),
      });
    } finally {
      setRoleSaving(null);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeMember(spaceId, removeTarget.user_id);
      toast({ tone: 'success', title: 'Miembro eliminado' });
      setRemoveTarget(null);
      onChanged();
    } catch (error) {
      setRemoveError(getErrorMessage(error, 'No se pudo eliminar al miembro.'));
    } finally {
      setRemoving(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    setLeaveError(null);
    try {
      await leaveSpace(spaceId, userId);
      toast({ tone: 'success', title: 'Has salido del espacio' });
      setLeaveOpen(false);
      navigate('/espacios', { replace: true });
    } catch (error) {
      setLeaveError(getErrorMessage(error, 'No se pudo salir del espacio.'));
    } finally {
      setLeaving(false);
    }
  }

  async function handleCancelInvitation() {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelInvitation(cancelTarget);
      toast({ tone: 'success', title: 'Invitación cancelada' });
      setCancelTarget(null);
      setInvitesVersion((current) => current + 1);
    } catch (error) {
      setCancelError(getErrorMessage(error, 'No se pudo cancelar la invitación.'));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
              Miembros del espacio
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'persona' : 'personas'} con acceso.
            </p>
          </div>
          {isOwner ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus aria-hidden="true" />
              Invitar
            </Button>
          ) : null}
        </div>

        <ul className="mt-4 divide-y divide-border/60">
          {members.map((member) => {
            const isCurrentUser = member.user_id === userId;
            const canEditRole = isOwner && member.role !== 'owner';
            return (
              <li key={member.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground">
                  {getInitials(member.profile?.display_name ?? 'Estudiante')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.profile?.display_name ?? 'Compañero de estudio'}
                    {isCurrentUser ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(tú)</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[member.role]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {member.role === 'owner' ? (
                    <Badge variant="accent">
                      <Crown className="h-3 w-3" aria-hidden="true" />
                      Propietario
                    </Badge>
                  ) : canEditRole ? (
                    <Select
                      aria-label={`Rol de ${member.profile?.display_name ?? 'este miembro'}`}
                      value={member.role}
                      disabled={roleSaving === member.user_id}
                      onChange={(event) =>
                        void handleRoleChange(member, event.target.value as 'editor' | 'viewer')
                      }
                      className="h-8 w-[132px] text-xs"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Lector</option>
                    </Select>
                  ) : (
                    <Badge variant="outline">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  )}
                  {isOwner && member.role !== 'owner' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-300"
                      aria-label={`Quitar a ${member.profile?.display_name ?? 'este miembro'}`}
                      onClick={() => {
                        setRemoveError(null);
                        setRemoveTarget(member);
                      }}
                    >
                      <UserMinus aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {!isOwner ? (
          <div className="mt-4 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLeaveError(null);
                setLeaveOpen(true);
              }}
            >
              Salir de este espacio
            </Button>
          </div>
        ) : null}
      </Card>

      {isOwner ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                Invitaciones pendientes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enlaces todavía no aceptados. Caducan automáticamente a los 14 días.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={invitations.refresh}>
              Actualizar
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {invitations.loading ? (
              <SkeletonList rows={2} />
            ) : invitations.error ? (
              <ErrorState message={invitations.error} onRetry={invitations.refresh} />
            ) : !invitations.data || invitations.data.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                No hay invitaciones pendientes. Las invitaciones se comparten mediante un enlace
                privado y no se pueden recuperar después.
              </p>
            ) : (
              invitations.data.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{invitation.invited_email}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ROLE_LABELS[invitation.role]} · caduca el {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start text-muted-foreground hover:text-red-300 sm:self-auto"
                    onClick={() => {
                      setCancelError(null);
                      setCancelTarget(invitation.id);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ))
            )}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            Si necesitas reenviar una invitación, crea una nueva. El enlace anterior dejará de ser
            válido.
          </p>
        </Card>
      ) : null}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        spaceId={spaceId}
        spaceName={spaceName}
        onInvited={() => setInvitesVersion((current) => current + 1)}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(next) => (!next ? setRemoveTarget(null) : undefined)}
        title="Quitar miembro"
        description={`${removeTarget?.profile?.display_name ?? 'Esta persona'} perderá el acceso al espacio y a sus materiales. Sus propios recursos personales no se borran.`}
        confirmLabel="Quitar acceso"
        loading={removing}
        error={removeError}
        onConfirm={() => void handleRemove()}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(next) => (!next ? setLeaveOpen(false) : undefined)}
        title="Salir del espacio"
        description={`Dejarás de ver los materiales de ${spaceName}. Si eres el propietario, debes eliminar el espacio en su lugar.`}
        confirmLabel="Salir del espacio"
        loading={leaving}
        error={leaveError}
        onConfirm={() => void handleLeave()}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(next) => (!next ? setCancelTarget(null) : undefined)}
        title="Cancelar invitación"
        description="El enlace dejará de funcionar inmediatamente. Puedes crear una invitación nueva cuando quieras."
        confirmLabel="Cancelar invitación"
        cancelLabel="Conservar"
        loading={cancelling}
        error={cancelError}
        onConfirm={() => void handleCancelInvitation()}
      />

      <p className="text-xs text-muted-foreground">
        Gestiona tus espacios desde{' '}
        <Link to="/espacios" className="text-foreground underline-offset-4 hover:text-primary hover:underline">
          la lista de espacios
        </Link>
        .
      </p>
    </div>
  );
}
