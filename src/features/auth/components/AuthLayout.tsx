import { Outlet } from 'react-router-dom';
import { Logo } from '../../../components/brand/Logo';
import { LockKeyhole, Share2, FolderTree } from 'lucide-react';

const FEATURES = [
  {
    icon: LockKeyhole,
    title: 'Un espacio personal, de verdad',
    description: 'Tus notas y archivos no se comparten por defecto. Decides qué abrir y con quién.',
  },
  {
    icon: Share2,
    title: 'Colaboración con permisos',
    description: 'Invita a tus compañeros como lectores o editores, sin perder el control.',
  },
  {
    icon: FolderTree,
    title: 'Todo en su sitio',
    description: 'Organiza por asignaturas, carpetas y materiales para llegar antes a lo importante.',
  },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar p-10 lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute inset-0 shell-texture opacity-40" aria-hidden="true" />
        <div className="relative z-10 flex flex-1 flex-col">
          <Logo size="md" />

          <div className="my-auto max-w-lg py-16">
            <p className="mb-4 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Espacio privado de estudio
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
              Estudia con orden.
              <br />
              Comparte con criterio.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Compila reúne tus materias, apuntes y materiales compartidos en un solo lugar,
              pensado para un grupo pequeño de compañeros.
            </p>

            <ul className="mt-10 space-y-5" aria-label="Características principales">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                    <feature.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{feature.title}</p>
                    <p className="mt-0.5 max-w-sm text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Acceso restringido a personas con una cuenta de Compila.
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 lg:hidden">
          <Logo size="sm" />
          <span className="text-xs text-muted-foreground">Estudio colaborativo</span>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <Outlet />
          </div>
        </div>
        <div className="px-5 pb-6 text-center text-xs text-muted-foreground lg:text-right lg:px-10">
          Compila · Hecho para estudiar en grupo
        </div>
      </main>
    </div>
  );
}
