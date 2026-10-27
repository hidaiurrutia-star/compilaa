/* eslint-disable react-refresh/only-export-components -- Archivo de configuración de rutas: mezcla exports de configuración y componentes lazy. */
import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ProtectedRoute, PublicOnlyRoute } from '../features/auth/components/AuthGuards';
import { AppLayout } from '../components/layout/AppLayout';
import { PageLoader } from '../components/ui/spinner';
import { NotFoundPage } from '../pages/NotFoundPage';

// Las páginas se cargan bajo demanda para mantener pequeño el bundle inicial.
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../features/auth/pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/pages/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const AcceptInvitationPage = lazy(() =>
  import('../features/invitations/AcceptInvitationPage').then((module) => ({
    default: module.AcceptInvitationPage,
  })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const PersonalPage = lazy(() =>
  import('../features/personal/PersonalPage').then((module) => ({ default: module.PersonalPage })),
);
const SpacesPage = lazy(() =>
  import('../features/spaces/SpacesPage').then((module) => ({ default: module.SpacesPage })),
);
const SpaceDetailPage = lazy(() =>
  import('../features/spaces/SpaceDetailPage').then((module) => ({
    default: module.SpaceDetailPage,
  })),
);
const SubjectsPage = lazy(() =>
  import('../features/subjects/SubjectsPage').then((module) => ({ default: module.SubjectsPage })),
);
const LibraryPage = lazy(() =>
  import('../features/library/LibraryPage').then((module) => ({ default: module.LibraryPage })),
);
const ResourceDetailPage = lazy(() =>
  import('../features/resources/ResourceDetailPage').then((module) => ({
    default: module.ResourceDetailPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader label="Cargando la página…" />}>{element}</Suspense>;
}

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: withSuspense(<LoginPage />) },
          { path: '/registro', element: withSuspense(<RegisterPage />) },
          { path: '/recuperar-contrasena', element: withSuspense(<ForgotPasswordPage />) },
        ],
      },
      // La recuperación crea una sesión temporal; no debe redirigirse al panel.
      { path: '/restablecer-contrasena', element: withSuspense(<ResetPasswordPage />) },
      { path: '/invitaciones/:token', element: withSuspense(<AcceptInvitationPage />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/personal', element: withSuspense(<PersonalPage />) },
          { path: '/espacios', element: withSuspense(<SpacesPage />) },
          { path: '/espacios/:spaceId', element: withSuspense(<SpaceDetailPage />) },
          { path: '/asignaturas', element: withSuspense(<SubjectsPage />) },
          { path: '/biblioteca', element: withSuspense(<LibraryPage />) },
          { path: '/biblioteca/:resourceId', element: withSuspense(<ResourceDetailPage />) },
          { path: '/configuracion', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
