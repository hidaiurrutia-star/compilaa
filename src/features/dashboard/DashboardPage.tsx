import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  FolderLock,
  LibraryBig,
  Mail,
  ShieldCheck,
  UploadCloud,
  Users,
} from 'lucide-react';
import { useAuth, useAuthenticatedUser } from '../../features/auth/AuthProvider';
import { useToast } from '../../components/feedback/ToastProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getDashboardData } from '../../services/dashboard';
import { respondToInvitation } from '../../services/invitations';
import { describeActivity } from '../../services/activity';
import { ROLE_LABELS } from '../../lib/permissions';
import { formatDate, formatRelativeDate, getErrorMessage, getFirstName } from '../../lib/utils';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Skeleton, SkeletonList } from '../../components/ui/skeleton';
import { ResourceCard } from '../../features/resources/components/ResourceCard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardPage() {
  const user = useAuthenticatedUser();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const dashboard = useAsyncData(() => getDashboardData(user.id), `dashboard:${user.id}`, {
    fallbackError: 'No se pudo cargar tu panel. Revisa que las migraciones estén aplicadas.',
  });

  const data = dashboard.data;
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Estudiante';

  async function handleInvitation(invitationId: string, inviteSpaceId: string, accept: boolean) {
    setRespondingId(invitationId);
    try {
      const spaceId = await respondToInvitation(invitationId, accept);
      if (accept) {
        toast({
          tone: 'success',
          title: 'Invitación aceptada',
          description: `Ya formas parte de ${data?.pendingInvitations.find((item) => item.invitation_id === invitationId)?.space_name ?? 'el espacio'}.`,
        });
        navigate(`/espacios/${spaceId ?? inviteSpaceId}`);
        return;
      }
      toast({ tone: 'success', title: 'Invitación rechazada' });
      dashboard.refresh();
    } catch (error) {
      toast({
        tone: 'error',
        title: 'No se pudo responder',
        description: getErrorMessage(error, 'Inténtalo de nuevo.'),
      });
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Tu panel"
        title={`${getGreeting()}, ${getFirstName(displayName)}`}
        description="Un repaso rápido a tus materias, espacios y lo que ha cambiado en tu grupo."
        actions={
          <>
            <Link
              to="/personal?nueva=nota"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-white/20 hover:bg-accent"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Nueva nota
            </Link>
            <Link
              to="/personal?nueva=archivo"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Subir material
            </Link>
          </>
        }
      />

      {dashboard.error ? (
        <ErrorState title="No se pudo cargar el panel" message={dashboard.error} onRetry={dashboard.refresh} />
      ) : dashboard.loading || !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-7 w-12" />
              </Card>
            ))}
          </div>
          <SkeletonList rows={4} />
        </div>
      ) : (
        <div className="space-y-7">
          <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Asignaturas
                </p>
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{data.subjects.length}</p>
              <Link
                to="/asignaturas"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Ver asignaturas
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Espacios
                </p>
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{data.spaces.length}</p>
              <Link
                to="/espacios"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Ver espacios
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Documentos recientes
                </p>
                <LibraryBig className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {data.recentDocuments.length}
              </p>
              <Link
                to="/biblioteca"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Abrir biblioteca
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Invitaciones
                </p>
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {data.pendingInvitations.length}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.pendingInvitations.length
                  ? 'Pendientes de responder'
                  : 'No tienes invitaciones pendientes'}
              </p>
            </Card>
          </section>

          {data.pendingInvitations.length > 0 ? (
            <section aria-labelledby="invitaciones-pendientes">
              <Card className="border-primary/25 bg-primary/[0.03] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id="invitaciones-pendientes" className="text-sm font-semibold">
                      Invitaciones pendientes
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Revisa quién te ha invitado antes de aceptar. Solo verás el contenido del
                      espacio después de unirte.
                    </p>
                    <ul className="mt-4 space-y-2">
                      {data.pendingInvitations.map((invitation) => (
                        <li
                          key={invitation.invitation_id}
                          className="flex flex-col gap-3 rounded-lg border border-border bg-card/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {invitation.space_name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {invitation.invited_by_name} te invita como{' '}
                              {ROLE_LABELS[invitation.role].toLowerCase()} · caduca el{' '}
                              {formatDate(invitation.expires_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={respondingId === invitation.invitation_id}
                              onClick={() =>
                                void handleInvitation(
                                  invitation.invitation_id,
                                  invitation.space_id,
                                  false,
                                )
                              }
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              loading={respondingId === invitation.invitation_id}
                              onClick={() =>
                                void handleInvitation(
                                  invitation.invitation_id,
                                  invitation.space_id,
                                  true,
                                )
                              }
                            >
                              Aceptar
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </section>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section aria-labelledby="documentos-recientes">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 id="documentos-recientes" className="text-sm font-semibold">
                    Documentos recientes
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Los últimos archivos a los que tienes acceso.
                  </p>
                </div>
                <Link
                  to="/biblioteca?tipo=document"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              {data.recentDocuments.length === 0 ? (
                <EmptyState
                  icon={UploadCloud}
                  title="Aún no hay documentos"
                  description="Sube apuntes, diapositivas o PDFs a tu espacio personal o a un espacio compartido."
                  action={
                    <Link
                      to="/personal?nueva=archivo"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent"
                    >
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                      Subir material
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.recentDocuments.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} userId={user.id} />
                  ))}
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section aria-labelledby="tus-espacios">
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="tus-espacios" className="text-sm font-semibold">
                      Tus espacios
                    </h2>
                    <Link
                      to="/espacios"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Gestionar
                    </Link>
                  </div>
                  {data.spaces.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
                      <Users className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Todavía no compartes ningún espacio. Puedes crear uno para tu grupo de
                        estudio.
                      </p>
                      <Link
                        to="/espacios"
                        className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Crear un espacio
                      </Link>
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {data.spaces.slice(0, 4).map((space) => (
                        <li key={space.id}>
                          <Link
                            to={`/espacios/${space.id}`}
                            className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 transition-colors hover:border-white/20 hover:bg-accent/60"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-primary">
                              {space.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground">
                                {space.name}
                              </span>
                              <span className="block text-[11px] text-muted-foreground">
                                {ROLE_LABELS[space.role]} · {space.memberCount}{' '}
                                {space.memberCount === 1 ? 'miembro' : 'miembros'}
                              </span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>

              <section aria-labelledby="privacidad">
                <Card className="p-5">
                  <h2 id="privacidad" className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    Privacidad por defecto
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Tu espacio personal solo lo ves tú. Los materiales se comparten cuando creas un
                    espacio con otras personas o cuando compartes un recurso de forma explícita.
                  </p>
                  <Link
                    to="/personal"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary"
                  >
                    <FolderLock className="h-3.5 w-3.5" aria-hidden="true" />
                    Ir a mi espacio
                  </Link>
                </Card>
              </section>
            </div>
          </div>

          <section aria-labelledby="actividad-reciente">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="actividad-reciente" className="flex items-center gap-2 text-sm font-semibold">
                    <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
                    Actividad reciente
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cambios en los espacios a los que perteneces.
                  </p>
                </div>
              </div>
              {data.activity.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                  Todavía no hay actividad registrada.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.activity.map((event) => (
                    <li key={event.id} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                      <div className="min-w-0 flex-1 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                        <p className="text-sm leading-5 text-foreground">
                          <span className="font-medium">
                            {event.actor?.display_name ?? 'Alguien'}
                          </span>{' '}
                          {describeActivity(event)}
                          {event.space ? (
                            <Link
                              to={`/espacios/${event.space.id}`}
                              className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                            >
                              {' '}
                              en {event.space.name}
                            </Link>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatRelativeDate(event.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="biblioteca-cta">
            <Card className="flex flex-col gap-4 border-border/80 bg-gradient-to-br from-card to-secondary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="biblioteca-cta" className="text-sm font-semibold">
                  Todo tu estudio, en un solo lugar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Busca por asignatura, tipo o fecha, y encuentra ese apunte que necesitas.
                </p>
              </div>
              <Link
                to="/biblioteca"
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:border-white/20 hover:bg-accent"
              >
                <LibraryBig className="h-4 w-4" aria-hidden="true" />
                Abrir biblioteca
              </Link>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
