import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useAuthenticatedUser } from '../../features/auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { listMySpaces } from '../../services/spaces';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../lib/permissions';
import { formatRelativeDate } from '../../lib/utils';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { SpaceDialog } from '../../features/spaces/components/SpaceDialog';
import type { SpaceRole } from '../../types/models';

const ROLE_BADGE: Record<SpaceRole, 'accent' | 'success' | 'outline'> = {
  owner: 'accent',
  editor: 'success',
  viewer: 'outline',
};

export function SpacesPage() {
  const user = useAuthenticatedUser();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const spacesState = useAsyncData(() => listMySpaces(user.id), `spaces:${user.id}`, {
    fallbackError: 'No se pudieron cargar tus espacios.',
  });

  const { refresh } = spacesState;
  const handleRealtime = useCallback(() => refresh(), [refresh]);
  useRealtimeRefresh([{ table: 'spaces' }, { table: 'space_members' }], `spaces-page:${user.id}`, handleRealtime);

  const spaces = spacesState.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Estudio en grupo"
        title="Espacios compartidos"
        description="Cada espacio es privado para sus miembros. Tú decides a quién invitar y con qué rol."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Crear espacio
          </Button>
        }
      />

      <Card className="mb-6 border-primary/20 bg-primary/[0.03] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-5 text-muted-foreground">
            Las invitaciones caducan a los 14 días y solo puede aceptarlas la cuenta con el correo
            invitado. El propietario administra los miembros; los editores crean contenido; los
            lectores solo consultan.
          </p>
        </div>
      </Card>

      {spacesState.error ? (
        <ErrorState message={spacesState.error} onRetry={spacesState.refresh} />
      ) : spacesState.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </Card>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no tienes espacios"
          description="Crea un espacio para compartir asignaturas, notas y materiales con tu grupo de estudio. Solo sus miembros podrán entrar."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Crear mi primer espacio
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {spaces.map((space) => (
            <Card
              key={space.id}
              className="group flex h-full flex-col p-5 transition-colors hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                  {space.name.charAt(0).toUpperCase()}
                </span>
                <Badge variant={ROLE_BADGE[space.role]}>{ROLE_LABELS[space.role]}</Badge>
              </div>

              <Link to={`/espacios/${space.id}`} className="mt-4 block rounded-sm">
                <h2 className="text-base font-semibold leading-6 text-foreground transition-colors group-hover:text-primary">
                  {space.name}
                </h2>
              </Link>
              <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {space.description || 'Sin descripción. Este espacio reúne materiales de estudio del grupo.'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {space.memberCount} {space.memberCount === 1 ? 'miembro' : 'miembros'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Creado {formatRelativeDate(space.created_at)}</span>
              </div>

              <p className="mt-3 border-t border-border/60 pt-3 text-[11px] leading-5 text-muted-foreground">
                {ROLE_DESCRIPTIONS[space.role]}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Link
                  to={`/espacios/${space.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
                >
                  Abrir espacio
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                {space.role === 'owner' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <UserPlus className="h-3 w-3" aria-hidden="true" />
                    Tú administras
                  </span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <SpaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={user.id}
        onSaved={(space) => {
          spacesState.refresh();
          navigate(`/espacios/${space.id}`);
        }}
      />
    </div>
  );
}
