import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FolderOpen, Lock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useAuthenticatedUser } from '../../features/auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { listMySpaces } from '../../services/spaces';
import { countResourcesBySubject, deleteSubject, listSubjects } from '../../services/subjects';
import { canEditSpace, ROLE_LABELS } from '../../lib/permissions';
import { getErrorMessage } from '../../lib/utils';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useToast } from '../../components/feedback/ToastProvider';
import { SubjectDialog } from '../../features/subjects/components/SubjectDialog';
import type { SpaceSummary, Subject } from '../../types/models';

interface SubjectsData {
  subjects: Subject[];
  spaces: SpaceSummary[];
  counts: Record<string, number>;
}

export function SubjectsPage() {
  const user = useAuthenticatedUser();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const dataState = useAsyncData<SubjectsData>(
    async () => {
      const [subjects, spaces, counts] = await Promise.all([
        listSubjects(),
        listMySpaces(user.id),
        countResourcesBySubject(),
      ]);
      return { subjects, spaces, counts };
    },
    `subjects-page:${user.id}`,
    { fallbackError: 'No se pudieron cargar las asignaturas.' },
  );

  const { refresh } = dataState;
  const handleRealtime = useCallback(() => refresh(), [refresh]);
  useRealtimeRefresh([{ table: 'subjects' }, { table: 'resources' }], `subjects:${user.id}`, handleRealtime);

  const data = dataState.data;
  const spaces = useMemo(() => data?.spaces ?? [], [data?.spaces]);
  const editableSpaces = useMemo(
    () => spaces.filter((space) => canEditSpace(space.role)),
    [spaces],
  );
  const roleBySpace = useMemo(
    () => new Map(spaces.map((space) => [space.id, space.role])),
    [spaces],
  );

  const personalSubjects = useMemo(
    () => (data?.subjects ?? []).filter((subject) => subject.space_id === null),
    [data?.subjects],
  );

  const subjectsBySpace = useMemo(() => {
    const map = new Map<string, Subject[]>();
    for (const subject of data?.subjects ?? []) {
      if (!subject.space_id) continue;
      const list = map.get(subject.space_id) ?? [];
      list.push(subject);
      map.set(subject.space_id, list);
    }
    return map;
  }, [data?.subjects]);

  function canManageSubject(subject: Subject): boolean {
    if (subject.space_id === null) return subject.owner_id === user.id;
    return canEditSpace(roleBySpace.get(subject.space_id));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSubject(deleteTarget.id);
      toast({
        tone: 'success',
        title: 'Asignatura eliminada',
        description: 'Los materiales que la usaban siguen disponibles, sin asignatura.',
      });
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'No se pudo eliminar la asignatura.'));
    } finally {
      setDeleting(false);
    }
  }

  function renderGroup(
    title: string,
    subtitle: string,
    subjects: Subject[],
    icon: 'personal' | 'space',
    spaceRole?: string,
  ) {
    if (subjects.length === 0) return null;
    return (
      <section key={title} aria-label={title}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {icon === 'personal' ? (
                <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {spaceRole ? <Badge variant="outline">{spaceRole}</Badge> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const count = data?.counts[subject.id] ?? 0;
            const manageable = canManageSubject(subject);
            return (
              <Card key={subject.id} className="group flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/biblioteca?asignatura=${subject.id}`} className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {subject.name}
                    </h3>
                  </Link>
                  <Badge variant="outline">
                    {count} {count === 1 ? 'material' : 'materiales'}
                  </Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-[1.25rem] text-xs leading-5 text-muted-foreground">
                  {subject.description || 'Sin descripción.'}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <Link
                    to={`/biblioteca?asignatura=${subject.id}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary"
                  >
                    <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    Ver materiales
                  </Link>
                  {manageable ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Editar ${subject.name}`}
                        onClick={() => {
                          setEditing(subject);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-300"
                        aria-label={`Eliminar ${subject.name}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(subject);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    );
  }

  const hasAnySubject = (data?.subjects.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Organización"
        title="Asignaturas"
        description="Agrupa tus materiales por materia. Puedes tener asignaturas personales y otras dentro de tus espacios compartidos."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            Nueva asignatura
          </Button>
        }
      />

      {dataState.error ? (
        <ErrorState message={dataState.error} onRetry={dataState.refresh} />
      ) : dataState.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : !hasAnySubject ? (
        <EmptyState
          icon={BookOpen}
          title="Aún no hay asignaturas"
          description="Crea una asignatura personal o una dentro de un espacio compartido para ordenar tus apuntes desde el primer día."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              Crear asignatura
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div className="space-y-8">
          {renderGroup(
            'Mis asignaturas personales',
            'Solo tú puedes verlas y usarlas en tus recursos personales.',
            personalSubjects,
            'personal',
          )}

          {spaces.map((space) => {
            const subjects = subjectsBySpace.get(space.id) ?? [];
            if (subjects.length === 0) return null;
            return renderGroup(
              space.name,
              canEditSpace(space.role)
                ? 'Asignaturas compartidas con los miembros de este espacio.'
                : 'Asignaturas compartidas. Solo lectura.',
              subjects,
              'space',
              ROLE_LABELS[space.role],
            );
          })}
        </div>
      )}

      {editableSpaces.length > 0 ? (
        <p className="mt-8 text-xs leading-5 text-muted-foreground">
          Puedes crear asignaturas dentro de {editableSpaces.length}{' '}
          {editableSpaces.length === 1 ? 'espacio' : 'espacios'} donde eres propietario o editor.
        </p>
      ) : null}

      <SubjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={user.id}
        subject={editing}
        editableSpaces={editableSpaces}
        onSaved={dataState.refresh}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => (!next ? setDeleteTarget(null) : undefined)}
        title="Eliminar asignatura"
        description={`Se eliminará «${deleteTarget?.name ?? ''}». Los materiales que la tengan asignada no se borran: quedarán sin asignatura.`}
        confirmLabel="Eliminar asignatura"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
