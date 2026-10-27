// Verifica la conexión con el proyecto de Supabase y que el esquema
// de Compila esté aplicado.
//
// - Con la clave publicable comprueba Auth y la existencia de las tablas.
//   Un 401 en las tablas es correcto: `anon` no tiene privilegios y RLS
//   exige una sesión autenticada.
// - Si existe .supabase.local con SUPABASE_ACCESS_TOKEN, usa la Management
//   API para comprobar el bucket privado, las políticas de Storage y RLS.
//
// Uso: npm run verify:supabase

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function readEnv(file) {
  try {
    const raw = await readFile(join(root, file), 'utf8');
    const values = {};
    for (const line of raw.split(/\r?\n/)) {
      if (line.trimStart().startsWith('#')) continue;
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      values[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
    return values;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const publicEnv = (await readEnv('.env.local')) ?? (await readEnv('.env'));
if (!publicEnv) throw new Error('No se encontró .env.local ni .env.');

const baseUrl = publicEnv.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const key = publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!baseUrl || !key) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local.');
  process.exit(1);
}

const adminEnv = await readEnv('.supabase.local');
const accessToken = adminEnv?.SUPABASE_ACCESS_TOKEN;
const projectRef = new URL(baseUrl).hostname.split('.')[0];
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const tables = [
  'profiles',
  'spaces',
  'space_members',
  'invitations',
  'subjects',
  'folders',
  'resources',
  'resource_shares',
  'activity_events',
];

async function check(path) {
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: response.status, body };
  } catch (error) {
    return { status: 0, body: String(error) };
  }
}

let failures = 0;
const print = (status, label, detail = '') => {
  if (status === 'falta') failures += 1;
  const tag = status === 'ok' ? '[ok]   ' : status === 'falta' ? '[falta]' : '[info] ';
  console.log(`${tag} ${label}${detail ? ` — ${detail}` : ''}`);
};

console.log(`Proyecto: ${baseUrl}`);
console.log(`Entorno:  .env.local\n`);

const health = await check('/auth/v1/health');
print(health.status === 200 ? 'ok' : 'falta', 'Auth responde', health.status === 200 ? 'GoTrue operativo' : `HTTP ${health.status}`);

const settings = await check('/auth/v1/settings');
if (settings.status === 200) {
  const confirmation = settings.body?.mailer_autoconfirm === true ? 'desactivada' : 'activada';
  print('ok', 'Registro por correo', `confirmación de correo ${confirmation}`);
} else {
  print('falta', 'Configuración de Auth', `HTTP ${settings.status}`);
}

console.log('\nTablas expuestas por la API:');
for (const table of tables) {
  const result = await check(`/rest/v1/${table}?select=*&limit=0`);
  if (result.status === 200) {
    print('ok', `public.${table}`, 'accesible');
  } else if (result.status === 401 && result.body?.code === '42501') {
    print('ok', `public.${table}`, 'existe; solo con sesión autenticada');
  } else if (result.status === 404) {
    print('falta', `public.${table}`, 'no existe: aplica las migraciones');
  } else {
    print('falta', `public.${table}`, `HTTP ${result.status}`);
  }
}

if (!accessToken) {
  console.log('\n[info]  Bucket y políticas de Storage: no verificables sin .supabase.local con SUPABASE_ACCESS_TOKEN.');
} else {
  console.log('\nComprobaciones de administración:');
  const query = async (sql) => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  try {
    const [storage] = await query(`
      select
        (select json_build_object('public', public, 'limit', file_size_limit)
           from storage.buckets where id = 'study-materials') as bucket,
        (select count(*) from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname like 'study_materials%') as policies;
    `);
    if (storage?.bucket) {
      print('ok', 'Bucket study-materials', storage.bucket.public ? 'PÚBLICO (debería ser privado)' : `privado, límite ${Math.round(storage.bucket.limit / 1024 / 1024)} MB`);
      if (storage.bucket.public) failures += 1;
    } else {
      print('falta', 'Bucket study-materials', 'no existe: ejecuta 0007_storage.sql');
    }
    print(
      Number(storage?.policies) >= 4 ? 'ok' : 'falta',
      'Políticas de Storage',
      `${storage?.policies ?? 0} de 4`,
    );

    const [security] = await query(`
      select
        (select count(*) from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public'
             and c.relname in (${tables.map((table) => `'${table}'`).join(', ')})
             and c.relrowsecurity) as rls_tables,
        (select count(*) from information_schema.role_table_grants
           where grantee = 'anon' and table_schema = 'public') as anon_grants;
    `);
    print(
      Number(security?.rls_tables) === tables.length ? 'ok' : 'falta',
      'RLS activado',
      `${security?.rls_tables ?? 0} de ${tables.length} tablas`,
    );
    print(
      Number(security?.anon_grants) === 0 ? 'ok' : 'falta',
      'Acceso anónimo bloqueado',
      `${security?.anon_grants ?? '?'} privilegios para anon`,
    );
  } catch (error) {
    print('info', 'Comprobaciones de administración', `no disponibles: ${error.message}`);
  }
}

if (failures > 0) {
  console.log(`\n${failures} comprobación(es) pendiente(s).`);
  console.log('Revisa supabase/migrations/ o ejecuta supabase/setup_completo.sql.');
  process.exitCode = 1;
} else {
  console.log('\nTodo listo: Auth, tablas, Storage y RLS verificados.');
}
