import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FolderLock, Pencil, Trash2, Users } from 'lucide-react';
import { useAuthenticatedUser } from '../../features/auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { deleteSpaceWithFiles, getSpaceDetails } from '../../services/spaces';
import { listSubjectsForSpace } from '../../services/subjects';
import { canEditSpace, canManageSpace, ROLE_LABELS } from '../../lib/permissions';
import { getErrorMessage } from '../../lib/utils';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton, SkeletonList } from '../../components/ui/skeleton';
import { Tabs } from '../../components/ui/tabs';
import { EmptyState } from '../../components/ui/empty-state';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useToast } from '../../components/feedback/ToastProvider';
import { ResourceBrowser } from '../../features/resources/components/ResourceBrowser';
import { SpaceDialog } from '../../features/spaces/components/SpaceDialog';
import { SpaceMembersPanel } from '../../features/spaces/components/SpaceMembersPanel';
import type { SpaceRole } from '../../types/models';

const ROLE_BADGE: Record<SpaceRole, 'accent' | 'success' | 'outline'> = {
  owner: 'accent',
  editor: 'success',
  viewer: 'outline',
};

export function SpaceDetailPage() {
  const { spaceId = '' } = useParams();
  const user = useAuthenticatedUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState('materiales');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const details = useAsyncData(
    () => getSpaceDetails(spaceId, user.id),
    `space-details:${spaceId}:${user.id}`,
    { enabled: Boolean(spaceId), fallbackError: 'No se pudo cargar el espacio.' },
  );

  const subjects = useAsyncData(
    () => listSubjectsForSpace(spaceId),
    `space-subjects:${spaceId}`,
    { enabled: Boolean(spaceId), fallbackError: 'No se pudieron cargar las asignaturas.' },
  );

  const { refresh: refreshDetails } = details;
  const handleRealtime = useCallback(() => refreshDetails(), [refreshDetails]);
  useRealtimeRefresh(
    [
      { table: 'spaces', filter: `id=eq.${spaceId}` },
      { table: 'space_members', filter: `space_id=eq.${spaceId}` },
    ],
    `space-detail:${spaceId}`,
    handleRealtime,
    Boolean(spaceId),
  );

  async function handleDelete() {
    if (!details.data) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSpaceWithFiles(details.data.space.id);
      toast({ tone: 'success', title: 'Espacio eliminado' });
      navigate('/espacios', { replace: true });
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'No se pudo eliminar el espacio.'));
    } finally {
      setDeleting(false);
    }
  }

  if (!spaceId) {
    return (
      <EmptyState
        icon={FolderLock}
        title="Espacio no encontrado"
        description="El enlace no incluye un espacio válido."
        action={
          <Link to="/espacios">
            <Button variant="outline">Volver a espacios</Button>
          </Link>
        }
      />
    );
  }

  if (details.loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Card className="p-5">
          <SkeletonList rows={3} />
        </Card>
      </div>
    );
  }

  if (details.error || !details.data) {
    const message = details.error ?? 'No se pudo cargar el espacio.';
    return (
      <div className="space-y-4">
        <Link
          to="/espacios"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver a espacios
        </Link>
        <ErrorState
          title="No pudimos abrir este espacio"
          message={message}
          onRetry={details.refresh}
        />
      </div>
    );
  }

  const { space, role, members } = details.data;
  const isOwner = canManageSpace(role);
  const canEdit = canEditSpace(role);
  const subjectsList = subjects.data ?? [];

  return (
    <div>
      <Link
        to="/espacios"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Todos los espacios
      </Link>

      <PageHeader
        eyebrow={`${ROLE_LABELS[role]} del espacio`}
        title={space.name}
        description={
          space.description ||
          'Este espacio reúne materiales de estudio y personas de confianza. Solo sus miembros pueden ver el contenido.'
        }
        actions={
          isOwner ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 aria-hidden="true" />
                Eliminar
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge variant={ROLE_BADGE[role]}>{ROLE_LABELS[role]}</Badge>
        <Badge variant="outline">
          <Users className="h-3 w-3" aria-hidden="true" />
          {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
        </Badge>
        {!canEdit ? (
          <Badge variant="outline">
            <FolderLock className="h-3 w-3" aria-hidden="true" />
            Solo lectura
          </Badge>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'materiales', label: 'Materiales' },
          { value: 'miembros', label: 'Miembros', count: members.length },
        ]}
        ariaLabel="Secciones del espacio"
        className="mb-6"
      />

      {tab === 'materiales' ? (
        <div role="tabpanel" id="panel-materiales" aria-labelledby="tab-materiales">
          {subjects.error ? (
            <ErrorState
              title="No se pudieron cargar las asignaturas"
              message={subjects.error}
              onRetry={subjects.refresh}
              className="mb-4"
            />
          ) : null}
          <ResourceBrowser
            scope={{ type: 'space', id: space.id }}
            userId={user.id}
            subjects={subjectsList}
            canEdit={canEdit}
            emptyTitle="Este espacio todavía no tiene materiales"
            emptyDescription={
              canEdit
                ? 'Crea una nota compartida o sube un documento para que el grupo pueda estudiarlo.'
                : 'Cuando un editor añada materiales, aparecerán aquí.'
            }
          />
        </div>
      ) : (
        <div role="tabpanel" id="panel-miembros" aria-labelledby="tab-miembros">
          <SpaceMembersPanel
            spaceId={space.id}
            spaceName={space.name}
            userId={user.id}
            role={role}
            members={members}
            onChanged={details.refresh}
          />
        </div>
      )}

      <SpaceDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={user.id}
        space={space}
        onSaved={() => details.refresh()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(next) => (!next ? setDeleteOpen(false) : undefined)}
        title="Eliminar espacio"
        description={`Se eliminará «${space.name}», sus materiales y sus archivos para todos los miembros. Esta acción no se puede deshacer y no borra los recursos personales de cada persona.`}
        confirmLabel="Eliminar espacio"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void handleDelete()}
      />

      {deleteError && !deleteOpen ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {deleteError}
        </div>
      ) : null}
    </div>
  );
}
