-- ============================================================
-- Compila · 0008 · RETURNING al crear recursos
-- ============================================================
-- PostgREST crea recursos con INSERT ... RETURNING para devolver la
-- fila creada. PostgreSQL aplica también la política SELECT a esa fila.
-- La política anterior comprobaba únicamente can_read_resource(), una
-- función STABLE que consulta public.resources y no ve la fila recién
-- insertada dentro de la misma sentencia, así que el INSERT fallaba con
-- «new row violates row-level security policy».
--
-- Añadimos la comprobación local del propietario (la misma condición que
-- ya aplicaba can_read_resource) para que el RETURNING sea válido. No se
-- amplía ningún permiso: el propietario ya podía leer sus recursos.

drop policy if exists "resources_select_authorized" on public.resources;
create policy "resources_select_authorized"
  on public.resources for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.can_read_resource(id, auth.uid())
  );
