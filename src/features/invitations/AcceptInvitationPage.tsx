import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LogIn,
  Mail,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import {
  acceptInvitation,
  declineInvitation,
  getInvitationPreview,
} from '../../services/invitations';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../lib/permissions';
import { formatDate, getErrorMessage } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton, SkeletonList } from '../../components/ui/skeleton';
import { ErrorState, FormError } from '../../components/feedback/ErrorState';
import { PageLoader } from '../../components/ui/spinner';
import { useToast } from '../../components/feedback/ToastProvider';

export function AcceptInvitationPage() {
  const { token = '' } = useParams();
  const { session, loading, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  const nextPath = `/invitaciones/${token}`;
  const loginPath = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerPath = `/registro?next=${encodeURIComponent(nextPath)}`;

  const previewState = useAsyncData(
    () => getInvitationPreview(token),
    `invitation-preview:${token}:${session?.user.id ?? 'anon'}`,
    {
      enabled: Boolean(token && session),
      fallbackError: 'No se pudo comprobar la invitación.',
    },
  );

  async function handleAccept() {
    setAccepting(true);
    setActionError(null);
    try {
      const spaceId = await acceptInvitation(token);
      toast({
        tone: 'success',
        title: 'Invitación aceptada',
        description: 'Ya formas parte del espacio. Te llevamos a sus materiales.',
      });
      navigate(`/espacios/${spaceId}`, { replace: true });
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo aceptar la invitación.'));
      setAccepting(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    setActionError(null);
    try {
      await declineInvitation(token);
      setDeclined(true);
    } catch (error) {
      setActionError(getErrorMessage(error, 'No se pudo rechazar la invitación.'));
    } finally {
      setDeclining(false);
    }
  }

  async function handleSwitchAccount() {
    setSwitching(true);
    try {
      await signOut();
      navigate(loginPath, { replace: true });
    } catch {
      setActionError('No se pudo cerrar la sesión actual. Inténtalo de nuevo.');
      setSwitching(false);
    }
  }

  if (loading) {
    return <PageLoader label="Comprobando tu sesión…" />;
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Invitación no válida"
          message="El enlace no incluye un token de invitación."
        />
        <Link to="/dashboard" className={buttonVariants()}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
          <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Te han invitado a un espacio</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Para ver los detalles y aceptar la invitación necesitas una cuenta de Compila. Entra con
          el mismo correo electrónico al que se envió la invitación.
        </p>

        <Card className="mt-6 border-primary/20 bg-primary/[0.03] p-4">
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Si inicias sesión con otro correo, la invitación no se podrá aceptar. No compartas este
            enlace con otras personas.
          </p>
        </Card>

        <div className="mt-6 space-y-3">
          <Link to={loginPath} className={buttonVariants({ className: 'w-full' })}>
            <LogIn aria-hidden="true" />
            Iniciar sesión y ver la invitación
          </Link>
          <Link
            to={registerPath}
            className="flex h-10 items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Crear una cuenta nueva
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Ya has iniciado sesión en otra pestaña?{' '}
          <Link to={loginPath} className="text-foreground underline-offset-4 hover:text-primary hover:underline">
            Vuelve a entrar aquí
          </Link>
          .
        </p>
      </div>
    );
  }

  if (declined) {
    return (
      <div>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Invitación rechazada</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No has entrado en el espacio. Si cambias de opinión, pide a la persona propietaria que te
          envíe una invitación nueva.
        </p>
        <Link to="/dashboard" className={buttonVariants({ className: 'mt-6 w-full' })}>
          Ir a mi panel
        </Link>
      </div>
    );
  }

  if (previewState.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <Skeleton className="h-8 w-64" />
        <Card className="p-5">
          <SkeletonList rows={3} />
        </Card>
      </div>
    );
  }

  if (previewState.error || !previewState.data) {
    return (
      <div>
        <ErrorState
          title="La invitación no es válida"
          message={
            previewState.error ??
            'Puede que haya caducado, que ya se haya usado o que el enlace esté incompleto. Pide una invitación nueva.'
          }
          onRetry={previewState.refresh}
        />
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" onClick={() => void handleSwitchAccount()} loading={switching}>
            Usar otra cuenta
          </Button>
          <Link
            to="/dashboard"
            className="flex h-10 items-center justify-center text-sm text-muted-foreground hover:text-foreground"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  const preview = previewState.data;

  return (
    <div>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">
        Invitación pendiente
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Únete a {preview.space_name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Te han invitado a colaborar en este espacio de estudio. Antes de aceptar, revisa el rol y el
        correo al que se envió la invitación.
      </p>

      <Card className="mt-6 p-5">
        <dl className="space-y-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Espacio</dt>
            <dd className="text-right font-medium">{preview.space_name}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Rol</dt>
            <dd className="text-right">
              <Badge variant="accent">{ROLE_LABELS[preview.role]}</Badge>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Invitación para</dt>
            <dd className="text-right font-medium">{preview.invited_email}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">Caduca</dt>
            <dd className="text-right">{formatDate(preview.expires_at)}</dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground">
          {ROLE_DESCRIPTIONS[preview.role]}
        </p>
      </Card>

      <div className="mt-4 rounded-lg border border-border bg-background/40 px-3.5 py-3">
        <p className="text-xs leading-5 text-muted-foreground">
          Has iniciado sesión como{' '}
          <span className="font-medium text-foreground">{user?.email}</span>. La invitación solo se
          puede aceptar con el correo al que fue enviada.
        </p>
      </div>

      <FormError message={actionError} />

      {actionError?.includes('otro correo electrónico') ? (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => void handleSwitchAccount()}
          loading={switching}
        >
          Cerrar sesión y usar otra cuenta
        </Button>
      ) : null}

      <div className="mt-5 space-y-2">
        <Button className="w-full" onClick={() => void handleAccept()} loading={accepting}>
          {!accepting ? <ArrowRight aria-hidden="true" /> : null}
          Aceptar invitación
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => void handleDecline()}
          loading={declining}
          disabled={accepting}
        >
          Rechazar invitación
        </Button>
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
        Al aceptar entrarás en el espacio con el rol indicado. Podrás salir más adelante desde la
        página de miembros, salvo que seas la persona propietaria.
      </p>
    </div>
  );
}
