import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  Pencil,
  Share2,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAuthenticatedUser } from '../auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import {
  createDownloadUrl,
  deleteResource,
  getResourceWithAccess,
  type ResourceAccess,
} from '../../services/resources';
import { listFolders } from '../../services/folders';
import { listPersonalSubjects, listSubjectsForSpace } from '../../services/subjects';
import { getResourcePermissions } from '../../lib/permissions';
import { formatBytes, formatDateTime, getErrorMessage } from '../../lib/utils';
import type { Folder, Subject } from '../../types/models';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Skeleton, SkeletonList } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useToast } from '../../components/feedback/ToastProvider';
import { ResourceTypeBadge } from './components/ResourceTypeBadge';
import { NoteDialog } from './components/NoteDialog';
import { MoveResourceDialog } from './components/MoveResourceDialog';
import { ShareResourceDialog } from './components/ShareResourceDialog';

interface DetailData {
  access: ResourceAccess;
  subjects: Subject[];
  folders: Folder[];
  downloadUrl: string | null;
  downloadError: string | null;
}

export function ResourceDetailPage() {
  const { resourceId = '' } = useParams();
  const user = useAuthenticatedUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const details = useAsyncData<DetailData>(
    async () => {
      const access = await getResourceWithAccess(resourceId, user.id);
      const resource = access.resource;
      const [subjects, folders] = resource.space_id
        ? await Promise.all([
            listSubjectsForSpace(resource.space_id),
            listFolders({ type: 'space', id: resource.space_id }, user.id),
          ])
        : await Promise.all([
            listPersonalSubjects(user.id),
            listFolders({ type: 'personal', id: null }, user.id),
          ]);

      let downloadUrl: string | null = null;
      let downloadError: string | null = null;
      if (resource.resource_type === 'document') {
        try {
          downloadUrl = await createDownloadUrl(resource);
        } catch (error) {
          downloadError = getErrorMessage(
            error,
            'No se pudo preparar el archivo. Puede que el almacenamiento no esté configurado.',
          );
        }
      }

      return { access, subjects, folders, downloadUrl, downloadError };
    },
    `resource-detail:${resourceId}:${user.id}`,
    { enabled: Boolean(resourceId), fallbackError: 'No se pudo cargar el material.' },
  );

  const { refresh } = details;
  const handleRealtime = useCallback(() => refresh(), [refresh]);
  useRealtimeRefresh(
    [{ table: 'resources', filter: `id=eq.${resourceId}` }],
    `resource-detail:${resourceId}`,
    handleRealtime,
    Boolean(resourceId),
  );

  async function handleDelete() {
    if (!details.data) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteResource(details.data.access.resource.id);
      toast({ tone: 'success', title: 'Material eliminado' });
      const spaceId = details.data.access.resource.space_id;
      navigate(spaceId ? `/espacios/${spaceId}` : '/personal', { replace: true });
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'No se pudo eliminar el material.'));
    } finally {
      setDeleting(false);
    }
  }

  if (!resourceId) {
    return (
      <ErrorState
        title="Material no encontrado"
        message="El enlace no incluye un recurso válido."
      />
    );
  }

  if (details.loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Card className="p-6">
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  if (details.error || !details.data) {
    return (
      <div className="space-y-4">
        <Link
          to="/biblioteca"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver a la biblioteca
        </Link>
        <ErrorState
          title="No pudimos abrir este material"
          message={
            details.error ??
            'El recurso no existe o ya no tienes acceso a él. Puede que se haya eliminado o que hayan retirado tu permiso.'
          }
          onRetry={details.refresh}
        />
      </div>
    );
  }

  const { access, subjects, folders, downloadUrl, downloadError } = details.data;
  const resource = access.resource;
  const permissions = getResourcePermissions({
    ownerId: resource.owner_id,
    spaceId: resource.space_id,
    userId: user.id,
    spaceRole: access.spaceRole,
    sharePermission: access.sharePermission,
  });
  const isSharedWithMe = resource.space_id === null && resource.owner_id !== user.id;
  const backTo = resource.space
    ? `/espacios/${resource.space.id}`
    : isSharedWithMe
      ? '/biblioteca?alcance=personal'
      : '/personal';

  return (
    <div>
      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {resource.space ? `Volver a ${resource.space.name}` : isSharedWithMe ? 'Volver a la biblioteca' : 'Volver a mi espacio'}
      </Link>

      <PageHeader
        eyebrow={
          resource.space
            ? `Material de ${resource.space.name}`
            : isSharedWithMe
              ? 'Compartido contigo'
              : 'Material personal'
        }
        title={resource.title}
        description={resource.description ?? undefined}
        actions={
          <>
            {permissions.canEdit && resource.resource_type === 'note' ? (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" />
                Editar
              </Button>
            ) : null}
            {permissions.canShare ? (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 aria-hidden="true" />
                Compartir
              </Button>
            ) : null}
            {permissions.canDelete ? (
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
            ) : null}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ResourceTypeBadge type={resource.resource_type} />
        <Badge variant={resource.space ? 'warning' : isSharedWithMe ? 'success' : 'outline'}>
          {resource.space
            ? resource.space.name
            : isSharedWithMe
              ? access.sharePermission === 'edit'
                ? 'Compartido contigo · edición'
                : 'Compartido contigo · lectura'
              : 'Privado'}
        </Badge>
        {resource.subject ? <Badge variant="outline">{resource.subject.name}</Badge> : null}
        {resource.folder ? (
          <Badge variant="outline">
            <FolderOpen className="h-3 w-3" aria-hidden="true" />
            {resource.folder.name}
          </Badge>
        ) : null}
        {!permissions.canEdit && resource.resource_type === 'note' ? (
          <Badge variant="outline">Solo lectura</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.45fr)]">
        <div className="min-w-0">
          {resource.resource_type === 'note' ? (
            <Card className="p-5 sm:p-7">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  Contenido de la nota
                </h2>
                {permissions.canEdit ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil aria-hidden="true" />
                    Editar contenido
                  </Button>
                ) : null}
              </div>
              <div className="note-content">{resource.content || 'Esta nota está vacía.'}</div>
            </Card>
          ) : (
            <Card className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                    <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{resource.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {resource.mime_type ?? 'Archivo'} · {formatBytes(resource.file_size)}
                    </p>
                  </div>
                </div>
                {downloadUrl ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ className: 'shrink-0' })}
                  >
                    <Download aria-hidden="true" />
                    Descargar archivo
                  </a>
                ) : (
                  <Button disabled className="shrink-0">
                    <Download aria-hidden="true" />
                    Descargar archivo
                  </Button>
                )}
              </div>

              {downloadError ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-5 text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {downloadError}
                </div>
              ) : null}

              {downloadUrl && resource.mime_type?.startsWith('image/') ? (
                <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background/60 p-2">
                  <img
                    src={downloadUrl}
                    alt={`Vista previa de ${resource.title}`}
                    className="mx-auto max-h-[560px] w-auto rounded-md object-contain"
                  />
                </div>
              ) : null}

              {downloadUrl && resource.mime_type === 'application/pdf' ? (
                <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-medium">Documento PDF</p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                    Los PDF se abren en una pestaña nueva mediante un enlace firmado temporal. El
                    archivo no es público y el enlace caduca a los pocos minutos.
                  </p>
                </div>
              ) : null}

              <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                El enlace de descarga es privado y temporal. No lo publiques fuera de tu grupo de
                estudio.
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Detalles</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Autor
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {resource.owner?.display_name ?? 'Persona de Compila'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Creado
                </dt>
                <dd className="text-right text-foreground">{formatDateTime(resource.created_at)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Actualizado
                </dt>
                <dd className="text-right text-foreground">{formatDateTime(resource.updated_at)}</dd>
              </div>
              {resource.resource_type === 'document' ? (
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    Tamaño
                  </dt>
                  <dd className="text-right text-foreground">{formatBytes(resource.file_size)}</dd>
                </div>
              ) : null}
            </dl>

            {permissions.canMove ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-5 w-full"
                onClick={() => setMoveOpen(true)}
              >
                <FolderOpen aria-hidden="true" />
                Mover u organizar
              </Button>
            ) : null}
          </Card>

          <Card className="border-border/70 bg-card/60 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Quién puede verlo
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {resource.space
                ? 'Todas las personas que pertenecen a este espacio pueden leerlo. Los lectores no pueden modificarlo ni eliminarlo.'
                : isSharedWithMe
                  ? 'La persona propietaria te ha dado acceso explícito a este recurso personal. Solo ella puede cambiar o retirar ese acceso.'
                  : 'Este material es privado. Solo tú puedes verlo hasta que lo compartas con una persona concreta.'}
            </p>
            {isSharedWithMe ? (
              <Link
                to="/biblioteca?alcance=personal"
                className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver otros recursos compartidos
              </Link>
            ) : null}
          </Card>
        </div>
      </div>

      <NoteDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        scope={
          resource.space_id
            ? { type: 'space', id: resource.space_id }
            : { type: 'personal', id: null }
        }
        userId={user.id}
        subjects={subjects}
        folders={folders}
        resource={resource}
        lockOrganization={isSharedWithMe}
        onSaved={refresh}
      />

      <MoveResourceDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        resource={resource}
        folders={folders}
        subjects={subjects}
        onMoved={refresh}
      />

      <ShareResourceDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        resource={resource}
        onShared={refresh}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(next) => (!next ? setDeleteOpen(false) : undefined)}
        title="Eliminar material"
        description={`Se eliminará «${resource.title}»${
          resource.resource_type === 'document' ? ' y su archivo del almacenamiento' : ''
        }. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
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
