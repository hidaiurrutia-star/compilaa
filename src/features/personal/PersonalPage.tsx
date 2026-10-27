import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, FolderLock, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuthenticatedUser } from '../../features/auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { listPersonalSubjects } from '../../services/subjects';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { EmptyState } from '../../components/ui/empty-state';
import { ResourceBrowser } from '../../features/resources/components/ResourceBrowser';
import type { Scope } from '../../types/models';

export function PersonalPage() {
  const user = useAuthenticatedUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialAction, setInitialAction] = useState<'note' | 'upload' | null>(() => {
    const action = searchParams.get('nueva');
    return action === 'nota' ? 'note' : action === 'archivo' ? 'upload' : null;
  });

  const subjectsState = useAsyncData(
    () => listPersonalSubjects(user.id),
    `personal-subjects:${user.id}`,
    { fallbackError: 'No se pudieron cargar tus asignaturas.' },
  );

  const handleActionHandled = useCallback(() => {
    setInitialAction(null);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('nueva');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const scope: Scope = { type: 'personal', id: null };
  const subjects = subjectsState.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Privado por defecto"
        title="Mi espacio"
        description="Tus notas y archivos personales. Nadie más puede verlos hasta que decidas compartirlos de forma explícita."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-primary/20 bg-primary/[0.03] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <FolderLock className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Tu espacio personal es privado</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Solo tú puedes abrir estos materiales. Para trabajar con otras personas, crea un
                espacio compartido o comparte un recurso concreto desde su ficha o desde el menú de
                acciones.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              Asignaturas personales
            </h2>
            <Link
              to="/asignaturas"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Gestionar
            </Link>
          </div>
          {subjectsState.loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : subjectsState.error ? (
            <ErrorState message={subjectsState.error} onRetry={subjectsState.refresh} className="mt-3" />
          ) : subjects.length === 0 ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Aún no tienes asignaturas personales. Créalas desde la sección de asignaturas para
              ordenar tus materiales.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subjects.slice(0, 6).map((subject) => (
                <Link key={subject.id} to={`/biblioteca?asignatura=${subject.id}&alcance=personal`}>
                  <Badge variant="outline" className="transition-colors hover:border-primary/30 hover:text-primary">
                    {subject.name}
                  </Badge>
                </Link>
              ))}
              {subjects.length > 6 ? (
                <span className="text-xs text-muted-foreground">+{subjects.length - 6} más</span>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <ResourceBrowser
        scope={scope}
        userId={user.id}
        subjects={subjects}
        canEdit
        initialAction={initialAction}
        onActionHandled={handleActionHandled}
        emptyTitle="Tu espacio personal está vacío"
        emptyDescription="Empieza con una nota rápida o sube los apuntes de tu última clase. Solo tú los verás."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Almacenamiento privado
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Los archivos se guardan en un bucket privado. Las descargas usan enlaces firmados
            temporales, nunca URLs públicas permanentes.
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Para compartir con criterio
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Comparte un recurso personal con una persona concreta o crea un espacio con roles de
            propietario, editor y lector.
          </p>
        </Card>
      </div>

      {subjects.length === 0 && !subjectsState.loading && !subjectsState.error ? (
        <div className="mt-8">
          <EmptyState
            icon={BookOpen}
            title="Organiza por asignatura"
            description="Las asignaturas te ayudan a filtrar la biblioteca y a encontrar cada material más rápido."
            action={
              <Link
                to="/asignaturas"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Crear una asignatura
              </Link>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
