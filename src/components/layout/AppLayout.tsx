import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';
import { Logo } from '../brand/Logo';
import { Button, buttonVariants } from '../ui/button';

function getSectionLabel(pathname: string): string {
  if (pathname.startsWith('/personal')) return 'Mi espacio';
  if (pathname.startsWith('/espacios')) return 'Espacios compartidos';
  if (pathname.startsWith('/asignaturas')) return 'Asignaturas';
  if (pathname.startsWith('/biblioteca')) return 'Biblioteca';
  if (pathname.startsWith('/configuracion')) return 'Configuración';
  if (pathname.startsWith('/invitaciones')) return 'Invitaciones';
  return 'Inicio';
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const section = getSectionLabel(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#contenido-principal"
        className="sr-only z-[200] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido principal
      </a>

      <Sidebar />
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú de navegación"
          >
            <Menu aria-hidden="true" />
          </Button>

          <Link to="/dashboard" className="lg:hidden" aria-label="Compila, ir al inicio">
            <Logo size="sm" showName={false} />
          </Link>

          <p className="hidden text-sm font-medium text-foreground lg:block" aria-current="page">
            {section}
          </p>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <GlobalSearch className="hidden w-64 md:block lg:w-72" />
            <Link
              to="/biblioteca"
              className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' md:hidden'}
              aria-label="Buscar en la biblioteca"
            >
              <Search aria-hidden="true" />
            </Link>
            <UserMenu />
          </div>
        </header>

        <main id="contenido-principal" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
