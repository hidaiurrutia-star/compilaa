import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileSearch,
  FileText,
  FolderOpen,
  LibraryBig,
  ListFilter,
  Plus,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAuthenticatedUser } from '../auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import {
  deleteResource,
  listAccessibleResources,
  listMySharePermissions,
} from '../../services/resources';
import { listAccessibleFolders } from '../../services/folders';
import { listMySpaces } from '../../services/spaces';
import { listSubjects } from '../../services/subjects';
import { getResourcePermissions } from '../../lib/permissions';
import { getErrorMessage } from '../../lib/utils';
import type {
  Folder,
  LibraryFilters,
  ResourceType,
  ResourceWithRelations,
  Scope,
  SpaceSummary,
  Subject,
} from '../../types/models';
import type { SharePermission } from '../../lib/supabase/database.types';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useToast } from '../../components/feedback/ToastProvider';
import { ResourceCard } from '../resources/components/ResourceCard';
import { ResourceActionsMenu } from '../resources/components/ResourceActionsMenu';
import { NoteDialog } from '../resources/components/NoteDialog';
import { MoveResourceDialog } from '../resources/components/MoveResourceDialog';
import { ShareResourceDialog } from '../resources/components/ShareResourceDialog';

const RESOURCE_TYPES: Array<{ value: '' | ResourceType; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'note', label: 'Notas' },
  { value: 'document', label: 'Documentos' },
];

const SCOPES: Array<{ value: LibraryFilters['scope']; label: string }> = [
  { value: '', label: 'Todo mi acceso' },
  { value: 'personal', label: 'Personal y compartido conmigo' },
  { value: 'shared', label: 'Dentro de espacios' },
];

const DATES: Array<{ value: LibraryFilters['date']; label: string }> = [
  { value: '', label: 'Cualquier fecha' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
];

const SORTS: Array<{ value: LibraryFilters['sort']; label: string }> = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'name', label: 'Título (A-Z)' },
];

const FILTER_KEYS = ['q', 'asignatura', 'carpeta', 'alcance', 'tipo', 'fecha', 'orden'] as const;

interface LibraryMeta {
  subjects: Subject[];
  spaces: SpaceSummary[];
  folders: Folder[];
  shares: Record<string, SharePermission>;
}

function parseFilters(params: URLSearchParams): LibraryFilters {
  const type = params.get('tipo');
  const scope = params.get('alcance');
  const date = params.get('fecha');
  const sort = params.get('orden');

  return {
    search: params.get('q') ?? '',
    subjectId: params.get('asignatura') ?? '',
    folderId: params.get('carpeta') ?? '',
    type: type === 'note' || type === 'document' ? type : '',
    date: date === '7d' || date === '30d' || date === '90d' ? date : '',
    sort: sort === 'oldest' || sort === 'name' ? sort : 'recent',
    scope: scope === 'personal' || scope === 'shared' ? scope : '',
  };
}

function scopeOf(resource: ResourceWithRelations): Scope {
  return resource.space_id
    ? { type: 'space', id: resource.space_id }
    : { type: 'personal', id: null };
}

export function LibraryPage() {
  const user = useAuthenticatedUser();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Mantiene el campo sincronizado cuando la URL cambia desde fuera de la
  // página, por ejemplo al usar la búsqueda global de la cabecera.
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const [noteOpen, setNoteOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceWithRelations | null>(null);
  const [moveResource, setMoveResource] = useState<ResourceWithRelations | null>(null);
  const [shareResource, setShareResource] = useState<ResourceWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceWithRelations | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [extraItems, setExtraItems] = useState<ResourceWithRelations[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [extraHasMore, setExtraHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const baseFilters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const filters = useMemo<LibraryFilters>(
    () => ({ ...baseFilters, search: debouncedSearch }),
    [baseFilters, debouncedSearch],
  );
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const metaState = useAsyncData<LibraryMeta>(
    async () => {
      const [subjects, spaces, folders, shares] = await Promise.all([
        listSubjects(),
        listMySpaces(user.id),
        listAccessibleFolders(),
        listMySharePermissions(user.id),
      ]);
      return { subjects, spaces, folders, shares };
    },
    `library-meta:${user.id}`,
    { fallbackError: 'No se pudieron cargar los filtros de la biblioteca.' },
  );

  const resourcesState = useAsyncData(
    () => listAccessibleResources(filters, user.id, 0),
    `library-resources:${user.id}:${filtersKey}`,
    { fallbackError: 'No se pudieron cargar los materiales.' },
  );

  useEffect(() => {
    setExtraItems([]);
    setNextPage(1);
    setExtraHasMore(false);
  }, [filtersKey]);

  const { refresh: refreshResources } = resourcesState;
  const { refresh: refreshMeta } = metaState;

  const handleRealtime = useCallback(() => {
    refreshResources();
    refreshMeta();
  }, [refreshResources, refreshMeta]);

  useRealtimeRefresh(
    [{ table: 'resources' }, { table: 'folders' }, { table: 'subjects' }],
    `library:${user.id}`,
    handleRealtime,
  );

  const subjects = metaState.data?.subjects ?? [];
  const spaces = useMemo(() => metaState.data?.spaces ?? [], [metaState.data?.spaces]);
  const folders = metaState.data?.folders ?? [];
  const shares = metaState.data?.shares ?? {};

  const spaceNames = useMemo(
    () => new Map(spaces.map((space) => [space.id, space.name])),
    [spaces],
  );
  const roleBySpace = useMemo(
    () => new Map(spaces.map((space) => [space.id, space.role])),
    [spaces],
  );

  const items = useMemo(() => {
    const byId = new Map<string, ResourceWithRelations>();
    for (const item of [...(resourcesState.data?.items ?? []), ...extraItems]) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return [...byId.values()];
  }, [resourcesState.data?.items, extraItems]);

  const total = resourcesState.data?.total ?? items.length;
  const hasMore = Boolean(resourcesState.data?.hasMore || extraHasMore);
  const hasFilters = FILTER_KEYS.some((key) => searchParams.has(key));

  const editingScope = editingResource ? scopeOf(editingResource) : null;
  const editingFolders = editingResource
    ? folders.filter((folder) => folder.space_id === editingResource.space_id)
    : [];
  const editingSubjects = editingResource
    ? subjects.filter((subject) => subject.space_id === editingResource.space_id)
    : [];
  const movingFolders = moveResource
    ? folders.filter((folder) => folder.space_id === moveResource.space_id)
    : [];
  const movingSubjects = moveResource
    ? subjects.filter((subject) => subject.space_id === moveResource.space_id)
    : [];

  function updateParam(key: string, value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  function clearFilters() {
    setSearch('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  function permissionsFor(resource: ResourceWithRelations) {
    return getResourcePermissions({
      ownerId: resource.owner_id,
      spaceId: resource.space_id,
      userId: user.id,
      spaceRole: resource.space_id ? roleBySpace.get(resource.space_id) ?? null : null,
      sharePermission: resource.space_id ? null : shares[resource.id] ?? null,
    });
  }

  function subjectLabel(subject: Subject): string {
    const spaceName = subject.space_id ? spaceNames.get(subject.space_id) : null;
    return spaceName ? `${subject.name} · ${spaceName}` : `${subject.name} · Personal`;
  }

  function folderLabel(folder: Folder): string {
    const spaceName = folder.space_id ? spaceNames.get(folder.space_id) : null;
    return spaceName ? `${folder.name} · ${spaceName}` : `${folder.name} · Personal`;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteResource(deleteTarget.id);
      toast({ tone: 'success', title: 'Material eliminado' });
      setDeleteTarget(null);
      refreshResources();
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'No se pudo eliminar el material.'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const result = await listAccessibleResources(filters, user.id, nextPage);
      setExtraItems((current) => [...current, ...result.items]);
      setNextPage((current) => current + 1);
      setExtraHasMore(result.hasMore);
    } catch (error) {
      toast({
        tone: 'error',
        title: 'No se pudieron cargar más materiales',
        description: getErrorMessage(error, 'Inténtalo de nuevo.'),
      });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Todo tu estudio"
        title="Biblioteca"
        description="Busca y filtra todos los materiales a los que tienes acceso: tus notas, tus archivos y lo que compartes con tu grupo."
        actions={
          <>
            <Link
              to="/personal?nueva=archivo"
              className={buttonVariants({ variant: 'outline' })}
            >
              <UploadCloud aria-hidden="true" />
              Subir material
            </Link>
            <Link to="/personal?nueva=nota" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              Nueva nota
            </Link>
          </>
        }
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="library-search" className="sr-only">
              Buscar en la biblioteca
            </label>
            <Input
              id="library-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                updateParam('q', event.target.value);
              }}
              placeholder="Buscar por título, descripción o contenido…"
              className="pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  updateParam('q', '');
                }}
                className="absolute right-2 top-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Field label="Asignatura" htmlFor="library-subject">
              <Select
                id="library-subject"
                value={filters.subjectId}
                onChange={(event) => updateParam('asignatura', event.target.value)}
              >
                <option value="">Todas</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subjectLabel(subject)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Carpeta" htmlFor="library-folder">
              <Select
                id="library-folder"
                value={filters.folderId}
                onChange={(event) => updateParam('carpeta', event.target.value)}
              >
                <option value="">Todas</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folderLabel(folder)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Alcance" htmlFor="library-scope">
              <Select
                id="library-scope"
                value={filters.scope}
                onChange={(event) => updateParam('alcance', event.target.value)}
              >
                {SCOPES.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipo" htmlFor="library-type">
              <Select
                id="library-type"
                value={filters.type}
                onChange={(event) => updateParam('tipo', event.target.value)}
              >
                {RESOURCE_TYPES.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Fecha" htmlFor="library-date">
              <Select
                id="library-date"
                value={filters.date}
                onChange={(event) => updateParam('fecha', event.target.value)}
              >
                {DATES.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Orden" htmlFor="library-sort">
              <Select
                id="library-sort"
                value={filters.sort}
                onChange={(event) => updateParam('orden', event.target.value)}
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {metaState.error ? (
        <ErrorState
          title="No se pudieron cargar los filtros"
          message={metaState.error}
          onRetry={metaState.refresh}
          className="mb-5"
        />
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
          {resourcesState.loading
            ? 'Buscando materiales…'
            : `${total} ${total === 1 ? 'material' : 'materiales'} en tu biblioteca`}
        </p>
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X aria-hidden="true" />
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {resourcesState.error ? (
        <ErrorState message={resourcesState.error} onRetry={resourcesState.refresh} />
      ) : resourcesState.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={hasFilters ? FileSearch : LibraryBig}
          title={hasFilters ? 'No encontramos materiales' : 'Tu biblioteca está vacía'}
          description={
            hasFilters
              ? 'Prueba con otro término o quita algunos filtros. Solo verás materiales a los que tengas acceso.'
              : 'Crea una nota o sube un documento a tu espacio personal. Cuando compartas algo, también aparecerá aquí.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Quitar filtros
              </Button>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/personal?nueva=nota" className={buttonVariants({ size: 'sm' })}>
                  <FileText aria-hidden="true" />
                  Crear una nota
                </Link>
                <Link
                  to="/personal?nueva=archivo"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <UploadCloud aria-hidden="true" />
                  Subir material
                </Link>
              </div>
            )
          }
          className="py-16"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((resource) => {
              const permissions = permissionsFor(resource);
              return (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  userId={user.id}
                  actions={
                    <ResourceActionsMenu
                      title={resource.title}
                      canEdit={permissions.canEdit && resource.resource_type === 'note'}
                      canMove={permissions.canMove}
                      canDelete={permissions.canDelete}
                      canShare={permissions.canShare}
                      onEdit={() => {
                        setEditingResource(resource);
                        setNoteOpen(true);
                      }}
                      onMove={() => setMoveResource(resource)}
                      onShare={() => setShareResource(resource)}
                      onDelete={() => {
                        setDeleteError(null);
                        setDeleteTarget(resource);
                      }}
                    />
                  }
                />
              );
            })}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLoadMore()}
                loading={loadingMore}
              >
                Cargar más materiales
              </Button>
            </div>
          ) : null}
        </>
      )}

      {metaState.data && spaces.length > 0 && !hasFilters ? (
        <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Espacios con material disponible:</span>
          {spaces.map((space) => (
            <Link key={space.id} to={`/espacios/${space.id}`}>
              <Badge variant="outline" className="hover:border-primary/30 hover:text-primary">
                {space.name}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}

      <NoteDialog
        open={noteOpen}
        onOpenChange={(next) => {
          setNoteOpen(next);
          if (!next) setEditingResource(null);
        }}
        scope={editingScope ?? { type: 'personal', id: null }}
        userId={user.id}
        subjects={editingSubjects}
        folders={editingFolders}
        resource={editingResource}
        lockOrganization={Boolean(
          editingResource && editingResource.space_id === null && editingResource.owner_id !== user.id,
        )}
        onSaved={refreshResources}
      />

      <MoveResourceDialog
        open={Boolean(moveResource)}
        onOpenChange={(next) => (!next ? setMoveResource(null) : undefined)}
        resource={moveResource}
        folders={movingFolders}
        subjects={movingSubjects}
        onMoved={() => {
          refreshResources();
          refreshMeta();
        }}
      />

      <ShareResourceDialog
        open={Boolean(shareResource)}
        onOpenChange={(next) => (!next ? setShareResource(null) : undefined)}
        resource={shareResource}
        onShared={refreshResources}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => (!next ? setDeleteTarget(null) : undefined)}
        title="Eliminar material"
        description={`Se eliminará «${deleteTarget?.title ?? 'este material'}»${
          deleteTarget?.resource_type === 'document' ? ' y su archivo del almacenamiento' : ''
        }. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void handleDelete()}
      />

      {items.length > 0 && hasFilters ? (
        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Los filtros se guardan en la dirección para que puedas compartir una búsqueda concreta.
        </p>
      ) : null}
    </div>
  );
}
