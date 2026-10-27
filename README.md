# Compila

Aplicación web para organizar el estudio en grupo: apuntes, documentos, asignaturas, carpetas y espacios compartidos con roles. Toda la interfaz está en español y usa un tema oscuro con acento lima.

> Estado: conectado y migrado en un proyecto real de Supabase. Auth, RLS, Storage y las URLs de redirección están verificados; queda pendiente probar el envío real de correos (SMTP) y los flujos completos con una cuenta de usuario.

## Funcionalidades

- **Biblioteca personal y compartida** con búsqueda de texto completo en español, filtros por asignatura, carpeta, tipo, fecha y orden.
- **Notas** con editor de texto y **documentos** subidos a un bucket privado (PDF, Word, PowerPoint, Excel, texto, Markdown, imágenes y ZIP; máximo 25 MB).
- **Espacios de estudio** con roles `owner`, `editor` y `viewer`; el propietario administra miembros e invitaciones.
- **Invitaciones por enlace** con caducidad de 14 días, token aleatorio guardado solo como hash SHA-256 y validación del correo de la cuenta.
- **Compartidos explícitos** de recursos personales con permisos de lectura o edición.
- **Asignaturas y carpetas** personales o dentro de un espacio, con jerarquías y validación de ciclos.
- **Panel de inicio** con invitaciones pendientes, actividad reciente y accesos rápidos.
- **Ajustes de cuenta**: nombre visible, cambio de contraseña con verificación de la contraseña actual, tema y cierre de sesión.
- Estados de carga, error, vacío y éxito; diálogos de confirmación para acciones destructivas; navegación por teclado y textos alternativos.
- Sin datos de demostración: si Supabase no está configurado se muestra una pantalla de configuración honesta.

## Stack

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19, TypeScript estricto, Vite 8 |
| Estilos | Tailwind CSS 3, primitivas inspiradas en shadcn/ui, Lucide |
| Rutas | React Router 7 |
| Formularios | React Hook Form + Zod |
| Backend | Supabase Auth, Postgres con RLS, Storage privado, Realtime opcional |
| Pruebas | Vitest |

## Requisitos

- Node.js 20 o superior (probado con Node 24).
- npm.
- Un proyecto de Supabase (plan gratuito suficiente para desarrollo).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
# Edita .env.local con la URL y la clave pública de tu proyecto
npm run dev
```

La aplicación queda disponible en <http://localhost:5173>.

### Variables de entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

- Usa la **URL base** del proyecto, sin `/rest/v1`.
- Usa únicamente la **clave publicable** (`anon` o `publishable`). Nunca incluyas `service_role` ni secretos en el frontend.
- `.env` y `.env.*` están ignorados por Git; solo se versiona `.env.example`.

## Configurar Supabase

### 1. Crear el proyecto

Crea un proyecto en <https://supabase.com/dashboard>. Copia la URL del proyecto y la clave publicable desde **Project Settings → API**.

### 2. Aplicar las migraciones

Los archivos están en `supabase/migrations/` y deben aplicarse **en orden**:

| Archivo | Contenido |
| --- | --- |
| `0001_schema.sql` | Tablas, índices, triggers de integridad y creación automática de perfiles |
| `0002_functions.sql` | Funciones auxiliares de autorización (`is_space_member`, `is_space_editor`, `is_space_owner`, etc.) |
| `0003_rls.sql` | Row Level Security de todas las tablas expuestas |
| `0004_rpc.sql` | RPC de invitaciones, respuesta a invitaciones y compartidos |
| `0005_activity.sql` | Registro de actividad y sus políticas |
| `0006_realtime.sql` | Publicación opcional de tablas en Realtime |
| `0007_storage.sql` | Bucket privado `study-materials`, límites y políticas de Storage |
| `0008_resource_returning.sql` | Permite el `INSERT ... RETURNING` de recursos aplicando la política de lectura al propietario |
| `0009_activity_cascade.sql` | Evita eventos huérfanos al borrar espacios o cuentas en cascada |

**Opción A · SQL Editor (recomendada)**

Genera un archivo combinado y pégalo entero una sola vez en el SQL Editor:

```bash
npm run db:bundle
```

Esto crea `supabase/setup_completo.sql` a partir de las migraciones. Ejecútalo completo, de arriba abajo, sobre un proyecto limpio. También puedes abrir y ejecutar cada archivo de `supabase/migrations/` en orden si prefieres revisarlos por separado. Son idempotentes en su mayor parte (`create or replace`, `drop policy if exists`, etc.), pero están pensados para aplicarse una vez.

**Opción B · Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

La CLI aplica las migraciones de `supabase/migrations/`. No ejecutes `supabase/seed.sql` si no quieres datos: solo contiene instrucciones, no inserts.

**Comprobar el resultado**

```bash
npm run verify:supabase
```

El script lee `.env.local` y comprueba Auth y las 9 tablas públicas con la clave publicable. Un `401` en las tablas es correcto: `anon` no tiene privilegios y RLS exige una sesión. Si existe `.supabase.local` con `SUPABASE_ACCESS_TOKEN`, además verifica el bucket privado, las 4 políticas de Storage, RLS en las 9 tablas y que `anon` no tenga privilegios. No escribe nada.

> Importante: este repositorio **no** aplica migraciones automáticamente al instalar; usa la opción A o B. Nunca subas `.env.local` ni `.supabase.local`.

### 3. Configurar Auth

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` en desarrollo y tu dominio en producción.
- **Redirect URLs**:
  - `http://localhost:5173/**`
  - `https://tu-dominio.example/**`
  - Añade cualquier URL de vista previa que uses.

La aplicación usa PKCE y estas rutas de retorno:

- Confirmación de registro → `/login?confirmado=1`
- Recuperación de contraseña → `/restablecer-contrasena`

Si el correo de confirmación no llega, revisa **Authentication → Emails** y la configuración SMTP del proyecto. En desarrollo puedes desactivar temporalmente la confirmación de correo, pero no lo recomendamos para producción.

> **Sin SMTP propio, Supabase limita el correo integrado a ~2 envíos por hora.** Al intentar registrarse se recibe `429 over_email_send_rate_limit` y la cuenta no se crea. Para un grupo pequeño, la opción inmediata es **Authentication → Providers → Email → Confirm email: off** (registro directo, sin correo). Para producción, configura un SMTP real (Brevo, Resend, Amazon SES…) en **Authentication → Emails → SMTP Settings** y vuelve a activar la confirmación.

### 4. Storage

La migración `0007_storage.sql` crea el bucket **privado** `study-materials` con:

- Límite de 25 MB por archivo.
- Lista de MIME permitidos.
- Políticas de lectura, escritura y borrado basadas en la ruta:
  - `u/{userId}/...` → solo el propietario puede escribir; la lectura se amplía si el recurso se comparte.
  - `s/{spaceId}/...` → miembros para lectura; propietario y editores para escritura.

No cambies el bucket a público: las descargas se realizan con URLs firmadas de corta duración.

Nota de compatibilidad: en los proyectos nuevos `storage.objects.owner_id` es de tipo `text`, así que la política compara `auth.uid()::text`. La migración no ejecuta `alter table storage.objects enable row level security` porque Supabase ya la activa y el rol `postgres` no es propietario de esa tabla; solo crea las políticas.

### 5. Realtime (opcional)

`0006_realtime.sql` publica las tablas necesarias si la publicación `supabase_realtime` existe. Si Realtime no está habilitado, la interfaz sigue funcionando y los datos se actualizan al recargar o al realizar acciones. Para una experiencia en vivo, activa Realtime en **Database → Replication** para las tablas publicadas.

## Scripts

```bash
npm run dev        # Servidor de desarrollo
npm run typecheck  # TypeScript en modo estricto
npm run lint       # ESLint
npm test           # Pruebas con Vitest
npm run build      # TypeScript + build de producción
npm run preview    # Sirve el build localmente
npm run db:bundle  # Genera supabase/setup_completo.sql
npm run verify:supabase  # Comprueba Auth, tablas y bucket
```

## Rutas

| Ruta | Acceso |
| --- | --- |
| `/login` | Solo visitantes |
| `/registro` | Solo visitantes |
| `/recuperar-contrasena` | Solo visitantes |
| `/restablecer-contrasena` | Público (la recuperación crea una sesión temporal) |
| `/invitaciones/:token` | Público; para aceptar se requiere sesión con el correo invitado |
| `/dashboard` | Autenticado |
| `/personal` | Autenticado |
| `/espacios` | Autenticado |
| `/espacios/:spaceId` | Autenticado y miembro del espacio |
| `/asignaturas` | Autenticado |
| `/biblioteca` | Autenticado |
| `/biblioteca/:resourceId` | Autenticado con permiso de lectura |
| `/configuracion` | Autenticado |

## Modelo de seguridad

- **RLS activado** en todas las tablas públicas expuestas. El cliente nunca decide permisos: las políticas y funciones SQL son la autoridad final.
- **Espacio personal privado por defecto.** Un recurso sin `space_id` solo es visible para su propietario y para las cuentas con un compartido explícito.
- **Membresías controladas por el servidor.** El cliente no puede insertar filas en `space_members`; se crean mediante triggers (propietario) o funciones `security definer` al aceptar una invitación.
- **Invitaciones con token hasheado.** El token en claro se devuelve una sola vez al crear la invitación; en la base de datos solo queda su SHA-256. Caducan a los 14 días y exigen que el correo de la sesión coincida.
- **Sin escalada de privilegios desde el cliente.** Los triggers impiden cambiar propietario, alcance, tipo o archivo de un recurso. Las políticas de `UPDATE` comprueban el rol actual.
- **Storage privado** con URLs firmadas y políticas por prefijo de ruta y pertenencia al espacio.
- **Sin claves secretas en el frontend.** Solo se usa la clave publicable; `service_role` no aparece en el código ni en `.env.example`.

## Pruebas

Las pruebas cubren la lógica pura que más riesgo tiene:

- Permisos de espacio y de recursos (propietario, editor, lector, compartidos).
- Esquemas Zod de autenticación, espacios, asignaturas y notas.
- Utilidades de formato, redirecciones seguras, errores y nombres de archivo.
- Validación de la URL de Supabase.
- Rutas de carpetas y protección frente a ciclos.

```bash
npm test
```

No hay una suite E2E dentro del repositorio que recorra la interfaz en un navegador: requiere un proyecto real y cuentas de prueba. La comprobación de esquema, RLS, Storage y Auth se hace con `npm run verify:supabase`.

Durante el desarrollo se ejecutaron dos pruebas temporales contra el proyecto real, fuera del repositorio:

- **Backend/RLS (41 comprobaciones):** dos cuentas desechables, notas personales y de espacio, roles, invitaciones, compartidos, subida/descarga/borrado de archivos personales y de espacio, URLs firmadas y borrado en cascada.
- **Interfaz (14 comprobaciones):** Playwright con Chrome sobre el servidor de desarrollo; login, panel, creación y apertura de una nota personal, creación de una asignatura y de un espacio con una nota, biblioteca, configuración, cierre de sesión y ausencia de errores de JavaScript.

Las cuentas, los espacios y los archivos se eliminaron al terminar. No se probaron el envío real de correos ni la aceptación de una invitación desde el enlace en el navegador.

## Limitaciones conocidas

- **Integración validada contra Supabase.** Las migraciones se aplicaron y se probaron Auth, RLS, invitaciones, compartidos, Storage, borrado en cascada y los flujos principales de la interfaz con cuentas temporales reales. Quedan pendientes el envío real de correos y la aceptación de invitaciones desde el enlace en el navegador.
- **Correo de Auth.** La confirmación de registro y la recuperación de contraseña dependen del SMTP configurado en Supabase; no se ha probado el envío real.
- **Transferencia de propiedad.** No existe una interfaz para transferir un espacio a otra cuenta; el propietario es inmutable desde el cliente.
- **Invitaciones.** El enlace solo se muestra una vez. Si se pierde, hay que crear una invitación nueva. El correo invitado debe tener ya una cuenta (o crearla antes de abrir el enlace).
- **Compartidos explícitos.** Solo se pueden compartir recursos **personales** con cuentas existentes. Los materiales de un espacio se comparten por pertenencia al espacio, no individualmente.
- **Previsualización de archivos.** Las imágenes se muestran en línea; el resto de documentos se descargan mediante URL firmada. No hay visor de PDF/Office integrado.
- **Carpetas.** Se pueden crear, renombrar, anidar y eliminar; no hay arrastrar y soltar ni movimiento masivo.
- **Papelera.** Las eliminaciones son definitivas; los diálogos de confirmación avisan antes de borrar.
- **Tiempo real.** Es opcional y depende de la configuración de Realtime; sin él, la interfaz recarga bajo demanda.
- **Internacionalización.** La interfaz y los formatos de fecha están fijados en español.
- **Sin modo offline ni PWA.**
- **Bundle.** Las páginas se cargan por ruta en chunks separados. La carga inicial incluye el chunk principal (~337 kB) y un chunk compartido (~355 kB); Vite no muestra advertencias de tamaño con el build actual, pero conviene vigilar el crecimiento de las dependencias compartidas.
- **Sin CI.** Los scripts existen, pero no hay un pipeline configurado en el repositorio.

## Estructura del proyecto

```text
src/
  app/            # Router, providers, tema y pantalla de configuración
  components/     # UI, layout y feedback reutilizable
  features/       # Autenticación, panel, espacios, asignaturas, biblioteca, ajustes…
  hooks/          # Carga asíncrona, debounce y Realtime
  lib/            # Utilidades, permisos, constantes, cliente y tipos de Supabase
  services/       # Acceso a datos y RPC
  types/          # Modelos de la aplicación
supabase/
  migrations/     # SQL versionado, en orden
  seed.sql        # Sin datos ficticios
```

## Despliegue

El proyecto es una SPA estática. El build incluye `public/_redirects`, que copia la reescritura SPA a `dist/` para Netlify y Cloudflare Pages; `vercel.json` hace lo mismo en Vercel. Sin esa reescritura, recargar `/login`, `/dashboard` o abrir un enlace de invitación devuelve 404.

### Netlify Drop (sin CLI)

1. `npm run build` (usa las variables de `.env.local` en el momento del build).
2. Entra en <https://app.netlify.com/drop> y arrastra la carpeta `dist/`.
3. Netlify devuelve una URL HTTPS del tipo `https://nombre-random.netlify.app`.
4. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: la URL de Netlify.
   - **Redirect URLs**: `https://nombre-random.netlify.app/**`.
5. Abre la URL en otro dispositivo e inicia sesión.

La clave publicable de Supabase queda incrustada en el bundle y es pública por diseño. No subas `.env.local` ni `.supabase.local` al repositorio.

### Vercel / Cloudflare Pages

- **Vercel**: importa el repositorio, framework Vite, build `npm run build`, salida `dist`. `vercel.json` ya define la reescritura.
- **Cloudflare Pages**: build `npm run build`, salida `dist`. `public/_redirects` se copia al build y aplica la reescritura.

### Acceso desde otros dispositivos en red local

`http://localhost:5173` **no funciona desde otro dispositivo**: `localhost` apunta a ese dispositivo, no a tu PC. Para probar en la misma Wi-Fi:

```bash
npm run dev -- --host
```

Vite muestra una URL `Network` con la IP de tu PC (por ejemplo `http://192.168.1.20:5173`). Ábrela en el otro dispositivo y añade ese origen a las **Redirect URLs** de Supabase.

> En HTTP plano (IP de la LAN) el navegador no considera la página un «contexto seguro»: `crypto.randomUUID()` y `crypto.subtle` (PKCE de Supabase) pueden fallar. Para uso real desde otros dispositivos usa el despliegue HTTPS; la LAN solo sirve para comprobar conectividad.

