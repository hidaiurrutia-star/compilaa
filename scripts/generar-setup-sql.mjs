// Genera un único archivo SQL con todas las migraciones, pensado para
// pegarlo una sola vez en el SQL Editor de Supabase.
//
// Uso: npm run db:bundle

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const outputFile = join(root, 'supabase', 'setup_completo.sql');

const files = (await readdir(migrationsDir))
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  throw new Error('No se encontraron migraciones en supabase/migrations.');
}

const header = `-- ============================================================
-- Compila · Instalación completa (archivo generado)
-- Generado desde supabase/migrations/ con: npm run db:bundle
--
-- Pégalo completo en el SQL Editor de Supabase UNA sola vez,
-- sobre un proyecto limpio. No lo uses con "supabase db push":
-- la CLI debe aplicar las migraciones individuales.
-- ============================================================`;

const parts = [header];

for (const file of files) {
  const sql = (await readFile(join(migrationsDir, file), 'utf8')).trimEnd();
  parts.push(
    `-- ------------------------------------------------------------\n-- ${file}\n-- ------------------------------------------------------------\n\n${sql}`,
  );
}

const output = `${parts.join('\n\n')}\n`;
await writeFile(outputFile, output, 'utf8');

const kilobytes = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1);
console.log(`Generado supabase/setup_completo.sql (${files.length} migraciones, ${kilobytes} kB).`);
