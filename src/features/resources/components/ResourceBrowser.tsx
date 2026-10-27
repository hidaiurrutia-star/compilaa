import { useCallback, useEffect, useState } from 'react';
import { FileSearch, FileText, Folder as FolderIcon, Search, UploadCloud, X } from 'lucide-react';
import type { Folder, ResourceWithRelations, Scope, Subject } from '../../../types/models';
import { deleteFolder, listFolders } from '../../../services/folders';
import { deleteResource, listScopeResources } from '../../../services/resources';
import { getErrorMessage } from '../../../lib/utils';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/empty-state';
import { Skeleton } from '../../../components/ui/skeleton';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/ToastProvider';
import { FoldersBar } from './FoldersBar';
import { ResourceCard } from './ResourceCard';
import { ResourceActionsMenu } from './ResourceActionsMenu';
import { NoteDialog } from './NoteDialog';
import { UploadDialog } from './UploadDialog';
import { FolderDialog } from './FolderDialog';
import { MoveResourceDialog } from './MoveResourceDialog';
import { ShareResourceDialog } from './ShareResourceDialog';

interface ResourceBrowserProps {
  scope: Scope;
  userId: string;
  subjects: Subject[];
  canEdit: boolean;
  initialAction?: 'note' | 'upload' | null;
  onActionHandled?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ResourceBrowser({
  scope,
  userId,
  subjects,
  canEdit,
  initialAction = null,
  onActionHandled,
  emptyTitle = 'Todavía no hay materiales',
  emptyDescription = 'Crea una nota o sube un documento para empezar.',
}: ResourceBrowserProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [noteOpen, setNoteOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceWithRelations | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [moveResource, setMoveResource] = useState<ResourceWithRelations | null>(null);
  const [shareResource, setShareResource] = useState<ResourceWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceWithRelations | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [deleteFolderError, setDeleteFolderError] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const [extraItems, setExtraItems] = useState<ResourceWithRelations[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [extraHasMore, setExtraHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const scopeId = scope.type === 'space' ? scope.id : 'personal';
  const scopeKey = `${scope.type}:${scopeId}:${userId}`;

  const foldersState = useAsyncData(() => listFolders(scope, userId), `folders:${scopeKey}`, {
    fallbackError: 'No se pudieron cargar las carpetas.',
  });

  const resourcesKey = `${scopeKey}:${selectedFolderId ?? 'all'}:${debouncedSearch.trim()}`;
  const resourcesState = useAsyncData(
    () =>
      listScopeResources(scope, userId, {
        folderId: selectedFolderId,
        search: debouncedSearch,
        page: 0,
      }),
    resourcesKey,
    { fallbackError: 'No se pudieron cargar los materiales.' },
  );

  useEffect(() => {
    setExtraItems([]);
    setNextPage(1);
    setExtraHasMore(false);
  }, [resourcesKey]);

  const { refresh: refreshResources } = resourcesState;
  const { refresh: refreshFolders } = foldersState;

  const handleRealtime = useCallback(() => {
    refreshResources();
    refreshFolders();
  }, [refreshResources, refreshFolders]);

  useRealtimeRefresh([{ table: 'resources' }], `resources:${scopeKey}`, handleRealtime);

  const refreshAll = useCallback(() => {
    refreshResources();
    refreshFolders();
  }, [refreshResources, refreshFolders]);

  useEffect(() => {
    if (!initialAction || !canEdit) return;
    if (initialAction === 'note') setNoteOpen(true);
    if (initialAction === 'upload') setUploadOpen(true);
    onActionHandled?.();
  }, [initialAction, canEdit, onActionHandled]);

  function openCreateNote() {
    setEditingResource(null);
    setNoteOpen(true);
  }

  function openEditNote(resource: ResourceWithRelations) {
    setEditingResource(resource);
    setNoteOpen(true);
  }

  function openShare(resource: ResourceWithRelations) {
    setShareResource(resource);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteResource(deleteTarget.id);
      toast({ tone: 'success', title: 'Recurso eliminado' });
      setDeleteTarget(null);
      refreshAll();
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'No se pudo eliminar el recurso.'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    setDeletingFolder(true);
    setDeleteFolderError(null);
    try {
      await deleteFolder(deleteFolderTarget.id);
      toast({
        tone: 'success',
        title: 'Carpeta eliminada',
        description: 'Los materiales que contenía siguen disponibles sin carpeta.',
      });
      if (selectedFolderId === deleteFolderTarget.id) setSelectedFolderId(null);
      setDeleteFolderTarget(null);
      refreshAll();
    } catch (error) {
      setDeleteFolderError(getErrorMessage(error, 'No se pudo eliminar la carpeta.'));
    } finally {
      setDeletingFolder(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const result = await listScopeResources(scope, userId, {
        folderId: selectedFolderId,
        search: debouncedSearch,
        page: nextPage,
      });
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

  const folders = foldersState.data ?? [];
  const items = [...(resourcesState.data?.items ?? []), ...extraItems];
  const total = resourcesState.data?.total ?? items.length;
  const hasMore = resourcesState.data?.hasMore || extraHasMore;
  const hasFilters = Boolean(debouncedSearch.trim() || selectedFolderId);

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="resource-search" className="sr-only">
              Buscar materiales en este espacio
            </label>
            <Input
              id="resource-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título o contenido…"
              className="pl-9 pr-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <UploadCloud aria-hidden="true" />
                Subir material
              </Button>
              <Button size="sm" onClick={openCreateNote}>
                <FileText aria-hidden="true" />
                Nueva nota
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <FoldersBar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelect={setSelectedFolderId}
        canManage={canEdit}
        onCreate={() => {
          setEditingFolder(null);
          setFolderOpen(true);
        }}
        onRename={(folder) => {
          setEditingFolder(folder);
          setFolderOpen(true);
        }}
        onDelete={(folder) => {
          setDeleteFolderError(null);
          setDeleteFolderTarget(folder);
        }}
      />

      {foldersState.error ? (
        <ErrorState
          title="No se pudieron cargar las carpetas"
          message={foldersState.error}
          onRetry={foldersState.refresh}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
        <p className="text-xs text-muted-foreground">
          {resourcesState.loading
            ? 'Cargando materiales…'
            : `${total} ${total === 1 ? 'material' : 'materiales'}${
                selectedFolderId ? ' en esta carpeta' : ''
              }`}
        </p>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedFolderId(null);
            }}
          >
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
          icon={hasFilters ? FileSearch : FolderIcon}
          title={hasFilters ? 'No encontramos materiales' : emptyTitle}
          description={
            hasFilters
              ? 'Prueba con otra búsqueda o quita los filtros de carpeta.'
              : emptyDescription
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedFolderId(null);
                }}
              >
                Quitar filtros
              </Button>
            ) : canEdit ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={openCreateNote}>
                  <FileText aria-hidden="true" />
                  Crear una nota
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                  <UploadCloud aria-hidden="true" />
                  Subir material
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((resource) => {
              const canManage =
                scope.type === 'personal' ? resource.owner_id === userId : canEdit;
              return (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  userId={userId}
                  actions={
                    <ResourceActionsMenu
                      title={resource.title}
                      canEdit={canManage && resource.resource_type === 'note'}
                      canMove={canManage}
                      canDelete={canManage}
                      canShare={canManage && resource.space_id === null}
                      onEdit={() => openEditNote(resource)}
                      onMove={() => setMoveResource(resource)}
                      onShare={() => openShare(resource)}
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
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => void handleLoadMore()} loading={loadingMore}>
                Cargar más materiales
              </Button>
            </div>
          ) : null}
        </>
      )}

      {canEdit ? (
        <>
          <NoteDialog
            open={noteOpen}
            onOpenChange={setNoteOpen}
            scope={scope}
            userId={userId}
            subjects={subjects}
            folders={folders}
            resource={editingResource}
            defaultFolderId={selectedFolderId}
            onSaved={refreshAll}
          />
          <UploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            scope={scope}
            userId={userId}
            subjects={subjects}
            folders={folders}
            defaultFolderId={selectedFolderId}
            onUploaded={refreshAll}
          />
          <FolderDialog
            open={folderOpen}
            onOpenChange={setFolderOpen}
            scope={scope}
            userId={userId}
            folders={folders}
            subjects={subjects}
            folder={editingFolder}
            defaultParentId={selectedFolderId}
            onSaved={refreshAll}
          />
          <MoveResourceDialog
            open={Boolean(moveResource)}
            onOpenChange={(next) => (!next ? setMoveResource(null) : undefined)}
            resource={moveResource}
            folders={folders}
            subjects={subjects}
            onMoved={refreshAll}
          />
        </>
      ) : null}

      <ShareResourceDialog
        open={Boolean(shareResource)}
        onOpenChange={(next) => (!next ? setShareResource(null) : undefined)}
        resource={shareResource}
        onShared={refreshAll}
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

      <ConfirmDialog
        open={Boolean(deleteFolderTarget)}
        onOpenChange={(next) => (!next ? setDeleteFolderTarget(null) : undefined)}
        title="Eliminar carpeta"
        description={`Se eliminará la carpeta «${deleteFolderTarget?.name ?? ''}». Los materiales que contiene no se borran: quedarán sin carpeta.`}
        confirmLabel="Eliminar carpeta"
        loading={deletingFolder}
        error={deleteFolderError}
        onConfirm={() => void handleDeleteFolder()}
      />
    </div>
  );
}
