import { Logo } from '../components/brand/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ExternalLink, ServerCog } from 'lucide-react';

export function ConfigMissingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 shell-texture opacity-30" aria-hidden="true" />
      <div className="relative w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="md" />
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
            Configuración pendiente
          </span>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-secondary">
              <ServerCog className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Conecta Compila con tu proyecto de Supabase</CardTitle>
            <CardDescription className="max-w-xl leading-6">
              La aplicación está compilada y lista, pero todavía no hay credenciales públicas de
              Supabase. Añade las variables de entorno y reinicia el servidor de desarrollo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">
                1. Crea el archivo <code className="text-foreground">.env.local</code> a partir de{' '}
                <code className="text-foreground">.env.example</code>
              </p>
              <pre className="overflow-x-auto rounded-lg border border-border bg-background/70 p-4 text-xs leading-6 text-muted-foreground">
                <code>{`VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE`}</code>
              </pre>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Usa la URL base del proyecto, sin <code className="text-foreground">/rest/v1</code>. La
                clave publicable es la única que puede ir en el frontend, y siempre con RLS activo.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">2. Aplica las migraciones SQL</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Ejecuta los archivos de <code className="text-foreground">supabase/migrations</code> en el
                editor SQL o con la CLI de Supabase. Sin las políticas RLS, la aplicación no podrá leer ni
                escribir datos.
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">3. Reinicia</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Detén el proceso actual y vuelve a ejecutar <code className="text-foreground">npm run dev</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5 text-sm">
              <span className="text-muted-foreground">
                El acceso estará disponible en cuanto configures el proyecto.
              </span>
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <a
                href="https://supabase.com/docs/guides/cli"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                Documentación de Supabase
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
