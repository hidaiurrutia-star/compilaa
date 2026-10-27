import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { PageLoader } from '../../../components/ui/spinner';
import { safeRedirectPath } from '../../../lib/utils';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Comprobando tu sesión…" />
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader label="Cargando Compila…" />
      </div>
    );
  }

  if (session) {
    // Conserva el destino de una invitación o de un enlace profundo tras
    // confirmar el correo, sin permitir redirecciones externas.
    const next = safeRedirectPath(
      new URLSearchParams(location.search).get('next'),
      '/dashboard',
    );
    return <Navigate to={next} replace />;
  }

  return <Outlet />;
}
