import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo size="lg" />
      <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
        <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Error 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Puede que el enlace esté mal escrito o que el contenido ya no esté disponible.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
