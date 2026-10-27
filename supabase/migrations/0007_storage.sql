-- ============================================================
-- Compila · 0007 · Storage privado para documentos
-- Bucket privado + rutas u/{userId}/... y s/{spaceId}/...
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- Helpers de rutas
-- ------------------------------------------------------------
create or replace function public.can_read_storage_path(p_name text, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_parts text[];
  v_scope text;
  v_scope_id text;
  v_space_id uuid;
begin
  if p_user_id is null or p_name is null then
    return false;
  end if;

  v_parts := storage.foldername(p_name);
  v_scope := coalesce(v_parts[1], '');
  v_scope_id := coalesce(v_parts[2], '');

  if v_scope = 'u' and v_scope_id = p_user_id::text then
    return true;
  end if;

  if v_scope = 's' then
    begin
      v_space_id := v_scope_id::uuid;
    exception when others then
      return false;
    end;

    if public.is_space_member(v_space_id, p_user_id) then
      return true;
    end if;
  end if;

  -- También se permite el acceso cuando el archivo pertenece a un recurso
  -- compartido explícitamente con la persona.
  return exists (
    select 1
    from public.resources r
    where r.storage_path = p_name
      and public.can_read_resource(r.id, p_user_id)
  );
end;
$$;

create or replace function public.can_write_storage_path(p_name text, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_parts text[];
  v_scope text;
  v_scope_id text;
  v_space_id uuid;
begin
  if p_user_id is null or p_name is null then
    return false;
  end if;

  v_parts := storage.foldername(p_name);
  v_scope := coalesce(v_parts[1], '');
  v_scope_id := coalesce(v_parts[2], '');

  if v_scope = 'u' then
    return v_scope_id = p_user_id::text;
  end if;

  if v_scope = 's' then
    begin
      v_space_id := v_scope_id::uuid;
    exception when others then
      return false;
    end;
    return public.is_space_editor(v_space_id, p_user_id);
  end if;

  return false;
end;
$$;

create or replace function public.can_delete_storage_path(p_name text, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_parts text[];
  v_scope text;
  v_scope_id text;
  v_space_id uuid;
begin
  if p_user_id is null or p_name is null then
    return false;
  end if;

  v_parts := storage.foldername(p_name);
  v_scope := coalesce(v_parts[1], '');
  v_scope_id := coalesce(v_parts[2], '');

  if v_scope = 'u' then
    return v_scope_id = p_user_id::text;
  end if;

  if v_scope = 's' then
    begin
      v_space_id := v_scope_id::uuid;
    exception when others then
      return false;
    end;
    return public.is_space_editor(v_space_id, p_user_id);
  end if;

  return exists (
    select 1 from public.resources r
    where r.storage_path = p_name and r.owner_id = p_user_id
  );
end;
$$;

revoke all on function public.can_read_storage_path(text, uuid) from public;
revoke all on function public.can_write_storage_path(text, uuid) from public;
revoke all on function public.can_delete_storage_path(text, uuid) from public;
grant execute on function public.can_read_storage_path(text, uuid) to authenticated;
grant execute on function public.can_write_storage_path(text, uuid) to authenticated;
grant execute on function public.can_delete_storage_path(text, uuid) to authenticated;

-- ------------------------------------------------------------
-- Políticas de Storage
-- ------------------------------------------------------------
-- storage.objects ya tiene RLS activada por Supabase y pertenece a
-- supabase_storage_admin. El rol postgres no puede cambiar esa
-- configuración; aquí solo creamos las políticas.

drop policy if exists "study_materials_select_authorized" on storage.objects;
create policy "study_materials_select_authorized"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'study-materials'
    and public.can_read_storage_path(name, auth.uid())
  );

drop policy if exists "study_materials_insert_authorized" on storage.objects;
create policy "study_materials_insert_authorized"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study-materials'
    and public.can_write_storage_path(name, auth.uid())
  );

drop policy if exists "study_materials_overwrite_authorized" on storage.objects;
create policy "study_materials_overwrite_authorized"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'study-materials'
    and public.can_write_storage_path(name, auth.uid())
  )
  with check (
    bucket_id = 'study-materials'
    and public.can_write_storage_path(name, auth.uid())
  );

drop policy if exists "study_materials_delete_authorized" on storage.objects;
create policy "study_materials_delete_authorized"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (
      -- storage.objects.owner_id es text en los proyectos nuevos de Supabase.
      owner_id = auth.uid()::text
      or public.can_delete_storage_path(name, auth.uid())
    )
  );
