-- ============================================================
-- Compila · Instalación completa (archivo generado)
-- Generado desde supabase/migrations/ con: npm run db:bundle
--
-- Pégalo completo en el SQL Editor de Supabase UNA sola vez,
-- sobre un proyecto limpio. No lo uses con "supabase db push":
-- la CLI debe aplicar las migraciones individuales.
-- ============================================================

-- ------------------------------------------------------------
-- 0001_schema.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0001 · Esquema base
-- Ejecutar en un proyecto de Supabase (PostgreSQL).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- Perfiles (vinculados a auth.users; nunca almacenamos contraseñas)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Estudiante'
    check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Espacios compartidos
-- ------------------------------------------------------------
create table if not exists public.spaces (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (char_length(description) <= 2000),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

-- ------------------------------------------------------------
-- Invitaciones (solo se guarda el hash del token)
-- ------------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  invited_email text not null
    check (char_length(invited_email) <= 254 and position('@' in invited_email) > 1),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Asignaturas
-- ------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (char_length(description) <= 2000),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Carpetas
-- ------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete cascade,
  parent_folder_id uuid references public.folders (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_folder_id is null or parent_folder_id <> id)
);

-- ------------------------------------------------------------
-- Recursos: notas y documentos
-- ------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 4000),
  resource_type text not null check (resource_type in ('note', 'document')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  content text check (char_length(content) <= 200000),
  storage_path text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'spanish',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')
    )
  ) stored,
  constraint resources_payload_check check (
    (resource_type = 'note' and content is not null and storage_path is null)
    or
    (resource_type = 'document' and storage_path is not null)
  )
);

-- ------------------------------------------------------------
-- Compartidos explícitos de recursos
-- ------------------------------------------------------------
create table if not exists public.resource_shares (
  id uuid primary key default extensions.gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  shared_with_user_id uuid references public.profiles (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete cascade,
  permission text not null default 'read' check (permission in ('read', 'edit')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((shared_with_user_id is not null) <> (space_id is not null))
);

-- ------------------------------------------------------------
-- Actividad
-- ------------------------------------------------------------
create table if not exists public.activity_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  space_id uuid references public.spaces (id) on delete set null,
  resource_id uuid references public.resources (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
create index if not exists spaces_owner_idx on public.spaces (owner_id);
create index if not exists space_members_space_idx on public.space_members (space_id);
create index if not exists space_members_user_idx on public.space_members (user_id);
create index if not exists invitations_space_idx on public.invitations (space_id);
create index if not exists invitations_email_idx on public.invitations (lower(invited_email));
create unique index if not exists invitations_pending_unique
  on public.invitations (space_id, lower(invited_email))
  where accepted_at is null;

create index if not exists subjects_space_idx on public.subjects (space_id);
create index if not exists subjects_owner_idx on public.subjects (owner_id);
create index if not exists folders_space_idx on public.folders (space_id);
create index if not exists folders_owner_idx on public.folders (owner_id);
create index if not exists folders_parent_idx on public.folders (parent_folder_id);
create index if not exists folders_subject_idx on public.folders (subject_id);

create index if not exists resources_space_idx on public.resources (space_id);
create index if not exists resources_owner_idx on public.resources (owner_id);
create index if not exists resources_folder_idx on public.resources (folder_id);
create index if not exists resources_subject_idx on public.resources (subject_id);
create index if not exists resources_created_idx on public.resources (created_at desc);
create index if not exists resources_search_idx on public.resources using gin (search_vector);
create unique index if not exists resources_storage_path_unique
  on public.resources (storage_path)
  where storage_path is not null;

create index if not exists resource_shares_resource_idx on public.resource_shares (resource_id);
create index if not exists resource_shares_user_idx on public.resource_shares (shared_with_user_id);
create index if not exists resource_shares_space_idx on public.resource_shares (space_id);
create unique index if not exists resource_shares_user_unique
  on public.resource_shares (resource_id, shared_with_user_id)
  where shared_with_user_id is not null;
create unique index if not exists resource_shares_space_unique
  on public.resource_shares (resource_id, space_id)
  where space_id is not null;

create index if not exists activity_space_created_idx
  on public.activity_events (space_id, created_at desc);
create index if not exists activity_actor_created_idx
  on public.activity_events (actor_id, created_at desc);
create index if not exists activity_resource_idx on public.activity_events (resource_id);

-- ------------------------------------------------------------
-- updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists spaces_set_updated_at on public.spaces;
create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Perfil automático al registrarse
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  v_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  if v_name = '' then
    v_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  if v_name = '' then
    v_name := 'Estudiante';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 60))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- El propietario siempre pertenece al espacio (fila con rol owner)
-- ------------------------------------------------------------
create or replace function public.add_space_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.space_members (space_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (space_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists spaces_add_owner_membership on public.spaces;
create trigger spaces_add_owner_membership
  after insert on public.spaces
  for each row execute function public.add_space_owner_membership();

-- ------------------------------------------------------------
-- Columnas de alcance inmutables
-- Evitan mover contenido entre espacios o cambiar de propietario.
-- ------------------------------------------------------------
create or replace function public.prevent_space_owner_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'El propietario del espacio no se puede cambiar desde el cliente'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists spaces_owner_immutable on public.spaces;
create trigger spaces_owner_immutable
  before update on public.spaces
  for each row execute function public.prevent_space_owner_change();

create or replace function public.protect_subject_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_id <> old.owner_id or new.space_id is distinct from old.space_id then
    raise exception 'El alcance de la asignatura no se puede cambiar'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists subjects_scope_immutable on public.subjects;
create trigger subjects_scope_immutable
  before update on public.subjects
  for each row execute function public.protect_subject_scope();

create or replace function public.protect_folder_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_id <> old.owner_id or new.space_id is distinct from old.space_id then
    raise exception 'El alcance de la carpeta no se puede cambiar'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists folders_scope_immutable on public.folders;
create trigger folders_scope_immutable
  before update on public.folders
  for each row execute function public.protect_folder_scope();

create or replace function public.protect_resource_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_id <> old.owner_id
    or new.space_id is distinct from old.space_id
    or new.resource_type <> old.resource_type
    or new.storage_path is distinct from old.storage_path
    or new.mime_type is distinct from old.mime_type
    or new.file_size is distinct from old.file_size
  then
    raise exception 'El alcance o el archivo de un recurso no se pueden cambiar'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists resources_scope_immutable on public.resources;
create trigger resources_scope_immutable
  before update on public.resources
  for each row execute function public.protect_resource_scope();

-- ------------------------------------------------------------
-- Integridad de carpetas (alcance, asignatura y ciclos)
-- ------------------------------------------------------------
create or replace function public.validate_folder_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent public.folders%rowtype;
  v_subject public.subjects%rowtype;
  v_cycle boolean;
begin
  if new.parent_folder_id is not null then
    if new.parent_folder_id = new.id then
      raise exception 'Una carpeta no puede contenerse a sí misma' using errcode = '23514';
    end if;

    select * into v_parent from public.folders where id = new.parent_folder_id;
    if not found then
      raise exception 'La carpeta padre no existe' using errcode = '23503';
    end if;

    if new.space_id is null then
      if v_parent.space_id is not null or v_parent.owner_id <> new.owner_id then
        raise exception 'La carpeta padre pertenece a otro espacio' using errcode = '23514';
      end if;
    elsif v_parent.space_id is distinct from new.space_id then
      raise exception 'La carpeta padre pertenece a otro espacio' using errcode = '23514';
    end if;

    with recursive ancestors as (
      select f.id, f.parent_folder_id
      from public.folders f
      where f.id = new.parent_folder_id
      union all
      select f.id, f.parent_folder_id
      from public.folders f
      join ancestors a on f.id = a.parent_folder_id
    )
    select exists (select 1 from ancestors where id = new.id) into v_cycle;

    if coalesce(v_cycle, false) then
      raise exception 'La jerarquía de carpetas no puede tener ciclos' using errcode = '23514';
    end if;
  end if;

  if new.subject_id is not null then
    select * into v_subject from public.subjects where id = new.subject_id;
    if not found then
      raise exception 'La asignatura no existe' using errcode = '23503';
    end if;

    if new.space_id is null then
      if v_subject.space_id is not null or v_subject.owner_id <> new.owner_id then
        raise exception 'La asignatura pertenece a otro espacio' using errcode = '23514';
      end if;
    elsif v_subject.space_id is distinct from new.space_id then
      raise exception 'La asignatura pertenece a otro espacio' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists folders_validate_scope on public.folders;
create trigger folders_validate_scope
  before insert or update on public.folders
  for each row execute function public.validate_folder_scope();

-- ------------------------------------------------------------
-- Integridad de recursos (carpeta y asignatura del mismo alcance)
-- ------------------------------------------------------------
create or replace function public.validate_resource_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_folder public.folders%rowtype;
  v_subject public.subjects%rowtype;
begin
  if new.folder_id is not null then
    select * into v_folder from public.folders where id = new.folder_id;
    if not found then
      raise exception 'La carpeta no existe' using errcode = '23503';
    end if;

    if new.space_id is null then
      if v_folder.space_id is not null or v_folder.owner_id <> new.owner_id then
        raise exception 'La carpeta pertenece a otro espacio' using errcode = '23514';
      end if;
    elsif v_folder.space_id is distinct from new.space_id then
      raise exception 'La carpeta pertenece a otro espacio' using errcode = '23514';
    end if;
  end if;

  if new.subject_id is not null then
    select * into v_subject from public.subjects where id = new.subject_id;
    if not found then
      raise exception 'La asignatura no existe' using errcode = '23503';
    end if;

    if new.space_id is null then
      if v_subject.space_id is not null or v_subject.owner_id <> new.owner_id then
        raise exception 'La asignatura pertenece a otro espacio' using errcode = '23514';
      end if;
    elsif v_subject.space_id is distinct from new.space_id then
      raise exception 'La asignatura pertenece a otro espacio' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists resources_validate_scope on public.resources;
create trigger resources_validate_scope
  before insert or update on public.resources
  for each row execute function public.validate_resource_scope();

-- ------------------------------------------------------------
-- 0002_functions.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0002 · Funciones auxiliares de autorización
-- Todas son SECURITY DEFINER para poder consultar la pertenencia
-- sin recursionar con las políticas RLS.
-- ============================================================

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(u.email) from auth.users u where u.id = auth.uid();
$$;

create or replace function public.is_space_member(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null
    and p_space_id is not null
    and exists (
      select 1
      from public.space_members m
      where m.space_id = p_space_id and m.user_id = p_user_id
    );
$$;

create or replace function public.space_role(p_space_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
  from public.space_members m
  where m.space_id = p_space_id and m.user_id = p_user_id
  limit 1;
$$;

create or replace function public.is_space_editor(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1
      from public.space_members m
      where m.space_id = p_space_id
        and m.user_id = p_user_id
        and m.role in ('owner', 'editor')
    ),
    false
  );
$$;

create or replace function public.is_space_owner(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1
      from public.space_members m
      where m.space_id = p_space_id
        and m.user_id = p_user_id
        and m.role = 'owner'
    ),
    false
  );
$$;

-- Puede consultar un recurso: propietario, miembro del espacio o compartido.
create or replace function public.can_read_resource(p_resource_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1
      from public.resources r
      where r.id = p_resource_id
        and (
          r.owner_id = p_user_id
          or (
            r.space_id is not null
            and public.is_space_member(r.space_id, p_user_id)
          )
          or exists (
            select 1
            from public.resource_shares s
            where s.resource_id = r.id
              and (
                s.shared_with_user_id = p_user_id
                or (
                  s.space_id is not null
                  and public.is_space_member(s.space_id, p_user_id)
                )
              )
          )
        )
    ),
    false
  );
$$;

-- Puede editar contenido: propietario, editor del espacio o compartido con edición.
create or replace function public.can_edit_resource(p_resource_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1
      from public.resources r
      where r.id = p_resource_id
        and (
          r.owner_id = p_user_id
          or (
            r.space_id is not null
            and public.is_space_editor(r.space_id, p_user_id)
          )
          or exists (
            select 1
            from public.resource_shares s
            where s.resource_id = r.id
              and s.shared_with_user_id = p_user_id
              and s.permission = 'edit'
          )
        )
    ),
    false
  );
$$;

-- Puede administrar el recurso (eliminar o gestionar sus compartidos).
create or replace function public.can_manage_resource(p_resource_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1
      from public.resources r
      where r.id = p_resource_id
        and (
          r.owner_id = p_user_id
          or (
            r.space_id is not null
            and public.is_space_editor(r.space_id, p_user_id)
          )
        )
    ),
    false
  );
$$;

-- Puede compartir explícitamente un recurso: solo el propietario de un
-- recurso personal. Los materiales de un espacio se comparten por pertenencia.
create or replace function public.can_share_resource(p_resource_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1
      from public.resources r
      where r.id = p_resource_id
        and r.owner_id = p_user_id
        and r.space_id is null
    ),
    false
  );
$$;

-- Nombres visibles solo para uno mismo, compañeros de espacio o personas
-- relacionadas mediante un recurso compartido.
create or replace function public.can_view_profile(p_target_id uuid, p_viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_target_id = p_viewer_id
    or exists (
      select 1
      from public.space_members a
      join public.space_members b on a.space_id = b.space_id
      where a.user_id = p_viewer_id and b.user_id = p_target_id
    )
    or exists (
      select 1
      from public.resource_shares s
      join public.resources r on r.id = s.resource_id
      where s.shared_with_user_id = p_viewer_id and r.owner_id = p_target_id
    )
    or exists (
      select 1
      from public.resource_shares s
      join public.resources r on r.id = s.resource_id
      where s.shared_with_user_id = p_target_id and r.owner_id = p_viewer_id
    );
$$;

-- Permisos de ejecución: las políticas se evalúan como `authenticated`,
-- por lo que estas funciones deben ser ejecutables por ese rol.
revoke all on function public.current_user_email() from public;
revoke all on function public.is_space_member(uuid, uuid) from public;
revoke all on function public.space_role(uuid, uuid) from public;
revoke all on function public.is_space_editor(uuid, uuid) from public;
revoke all on function public.is_space_owner(uuid, uuid) from public;
revoke all on function public.can_read_resource(uuid, uuid) from public;
revoke all on function public.can_edit_resource(uuid, uuid) from public;
revoke all on function public.can_manage_resource(uuid, uuid) from public;
revoke all on function public.can_share_resource(uuid, uuid) from public;
revoke all on function public.can_view_profile(uuid, uuid) from public;

grant execute on function public.current_user_email() to authenticated;
grant execute on function public.is_space_member(uuid, uuid) to authenticated;
grant execute on function public.space_role(uuid, uuid) to authenticated;
grant execute on function public.is_space_editor(uuid, uuid) to authenticated;
grant execute on function public.is_space_owner(uuid, uuid) to authenticated;
grant execute on function public.can_read_resource(uuid, uuid) to authenticated;
grant execute on function public.can_edit_resource(uuid, uuid) to authenticated;
grant execute on function public.can_manage_resource(uuid, uuid) to authenticated;
grant execute on function public.can_share_resource(uuid, uuid) to authenticated;
grant execute on function public.can_view_profile(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 0003_rls.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0003 · Row Level Security
-- Ninguna tabla expuesta al cliente queda sin políticas.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.invitations enable row level security;
alter table public.subjects enable row level security;
alter table public.folders enable row level security;
alter table public.resources enable row level security;
alter table public.resource_shares enable row level security;
alter table public.activity_events enable row level security;

-- ------------------------------------------------------------
-- Perfiles
-- ------------------------------------------------------------
drop policy if exists "profiles_select_authorized" on public.profiles;
create policy "profiles_select_authorized"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.can_view_profile(id, auth.uid()));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------
-- Espacios
-- ------------------------------------------------------------
drop policy if exists "spaces_select_members" on public.spaces;
create policy "spaces_select_members"
  on public.spaces for select
  to authenticated
  using (owner_id = auth.uid() or public.is_space_member(id, auth.uid()));

drop policy if exists "spaces_insert_self" on public.spaces;
create policy "spaces_insert_self"
  on public.spaces for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "spaces_update_owner" on public.spaces;
create policy "spaces_update_owner"
  on public.spaces for update
  to authenticated
  using (public.is_space_owner(id, auth.uid()))
  with check (owner_id = auth.uid() and public.is_space_owner(id, auth.uid()));

drop policy if exists "spaces_delete_owner" on public.spaces;
create policy "spaces_delete_owner"
  on public.spaces for delete
  to authenticated
  using (public.is_space_owner(id, auth.uid()));

-- ------------------------------------------------------------
-- Miembros
-- La inserción solo ocurre desde el trigger del propietario y desde
-- la función segura de aceptación de invitaciones.
-- ------------------------------------------------------------
drop policy if exists "space_members_select_members" on public.space_members;
create policy "space_members_select_members"
  on public.space_members for select
  to authenticated
  using (public.is_space_member(space_id, auth.uid()));

drop policy if exists "space_members_update_owner" on public.space_members;
create policy "space_members_update_owner"
  on public.space_members for update
  to authenticated
  using (role <> 'owner' and public.is_space_owner(space_id, auth.uid()))
  with check (role in ('editor', 'viewer') and public.is_space_owner(space_id, auth.uid()));

drop policy if exists "space_members_delete_self_or_owner" on public.space_members;
create policy "space_members_delete_self_or_owner"
  on public.space_members for delete
  to authenticated
  using (
    role <> 'owner'
    and (user_id = auth.uid() or public.is_space_owner(space_id, auth.uid()))
  );

-- ------------------------------------------------------------
-- Invitaciones
-- ------------------------------------------------------------
drop policy if exists "invitations_select_owner_or_invitee" on public.invitations;
create policy "invitations_select_owner_or_invitee"
  on public.invitations for select
  to authenticated
  using (
    public.is_space_owner(space_id, auth.uid())
    or lower(invited_email) = public.current_user_email()
  );

drop policy if exists "invitations_delete_owner" on public.invitations;
create policy "invitations_delete_owner"
  on public.invitations for delete
  to authenticated
  using (public.is_space_owner(space_id, auth.uid()));

-- ------------------------------------------------------------
-- Asignaturas
-- ------------------------------------------------------------
drop policy if exists "subjects_select_authorized" on public.subjects;
create policy "subjects_select_authorized"
  on public.subjects for select
  to authenticated
  using (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_member(space_id, auth.uid()))
  );

drop policy if exists "subjects_insert_authorized" on public.subjects;
create policy "subjects_insert_authorized"
  on public.subjects for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (
      space_id is null
      or public.is_space_editor(space_id, auth.uid())
    )
  );

drop policy if exists "subjects_update_authorized" on public.subjects;
create policy "subjects_update_authorized"
  on public.subjects for update
  to authenticated
  using (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
  )
  with check (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
  );

drop policy if exists "subjects_delete_authorized" on public.subjects;
create policy "subjects_delete_authorized"
  on public.subjects for delete
  to authenticated
  using (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
  );

-- ------------------------------------------------------------
-- Carpetas
-- ------------------------------------------------------------
drop policy if exists "folders_select_authorized" on public.folders;
create policy "folders_select_authorized"
  on public.folders for select
  to authenticated
  using (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_member(space_id, auth.uid()))
  );

drop policy if exists "folders_insert_authorized" on public.folders;
create policy "folders_insert_authorized"
  on public.folders for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (
      space_id is null
      or public.is_space_editor(space_id, auth.uid())
    )
  );

drop policy if exists "folders_update_authorized" on public.folders;
create policy "folders_update_authorized"
  on public.folders for update
  to authenticated
  using (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
  )
  with check (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
  );

drop policy if exists "folders_delete_authorized" on public.folders;
create policy "folders_delete_authorized"
  on public.folders for delete
  to authenticated
  using (
    (space_id is null and owner_id = auth.uid())
    or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
  );

-- ------------------------------------------------------------
-- Recursos
-- ------------------------------------------------------------
drop policy if exists "resources_select_authorized" on public.resources;
create policy "resources_select_authorized"
  on public.resources for select
  to authenticated
  using (public.can_read_resource(id, auth.uid()));

drop policy if exists "resources_insert_authorized" on public.resources;
create policy "resources_insert_authorized"
  on public.resources for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (
      (space_id is null and storage_path is null)
      or (space_id is null and storage_path like ('u/' || auth.uid()::text || '/%'))
      or (space_id is not null and public.is_space_editor(space_id, auth.uid()))
    )
    and (
      resource_type = 'note'
      or (space_id is null and storage_path like ('u/' || auth.uid()::text || '/%'))
      or (space_id is not null and storage_path like ('s/' || space_id::text || '/%'))
    )
  );

drop policy if exists "resources_update_authorized" on public.resources;
create policy "resources_update_authorized"
  on public.resources for update
  to authenticated
  using (public.can_edit_resource(id, auth.uid()))
  with check (public.can_edit_resource(id, auth.uid()));

drop policy if exists "resources_delete_authorized" on public.resources;
create policy "resources_delete_authorized"
  on public.resources for delete
  to authenticated
  using (public.can_manage_resource(id, auth.uid()));

-- ------------------------------------------------------------
-- Compartidos explícitos
-- ------------------------------------------------------------
drop policy if exists "resource_shares_select_authorized" on public.resource_shares;
create policy "resource_shares_select_authorized"
  on public.resource_shares for select
  to authenticated
  using (
    shared_with_user_id = auth.uid()
    or created_by = auth.uid()
    or public.can_manage_resource(resource_id, auth.uid())
  );

drop policy if exists "resource_shares_insert_manager" on public.resource_shares;
create policy "resource_shares_insert_manager"
  on public.resource_shares for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and shared_with_user_id is not null
    and space_id is null
    and public.can_share_resource(resource_id, auth.uid())
  );

drop policy if exists "resource_shares_update_manager" on public.resource_shares;
create policy "resource_shares_update_manager"
  on public.resource_shares for update
  to authenticated
  using (public.can_share_resource(resource_id, auth.uid()))
  with check (
    shared_with_user_id is not null
    and space_id is null
    and public.can_share_resource(resource_id, auth.uid())
  );

drop policy if exists "resource_shares_delete_manager" on public.resource_shares;
create policy "resource_shares_delete_manager"
  on public.resource_shares for delete
  to authenticated
  using (public.can_share_resource(resource_id, auth.uid()));

-- ------------------------------------------------------------
-- Actividad (solo inserción mediante triggers SECURITY DEFINER)
-- ------------------------------------------------------------
drop policy if exists "activity_select_authorized" on public.activity_events;
create policy "activity_select_authorized"
  on public.activity_events for select
  to authenticated
  using (
    actor_id = auth.uid()
    or (space_id is not null and public.is_space_member(space_id, auth.uid()))
  );

-- ------------------------------------------------------------
-- Privilegios base de tablas (RLS sigue siendo la autorización real)
-- ------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ------------------------------------------------------------
-- 0004_rpc.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0004 · RPC seguras de invitaciones y compartidos
-- ============================================================

-- ------------------------------------------------------------
-- Crear invitación (solo propietario). Devuelve el token en claro
-- una única vez; en la base de datos solo queda su hash SHA-256.
-- ------------------------------------------------------------
create or replace function public.create_space_invitation(
  p_space_id uuid,
  p_email text,
  p_role text default 'viewer'
)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_expires_at timestamptz := now() + interval '14 days';
  v_already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = 'P0001';
  end if;

  if not public.is_space_owner(p_space_id, auth.uid()) then
    raise exception 'Solo el propietario puede invitar a nuevos miembros.' using errcode = 'P0001';
  end if;

  if p_role not in ('editor', 'viewer') then
    raise exception 'El rol de la invitación no es válido.' using errcode = 'P0001';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Escribe un correo electrónico válido.' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.space_members m
    join auth.users u on u.id = m.user_id
    where m.space_id = p_space_id and lower(u.email) = v_email
  ) into v_already_member;

  if v_already_member then
    raise exception 'Esa persona ya forma parte del espacio.' using errcode = 'P0001';
  end if;

  delete from public.invitations
  where space_id = p_space_id
    and lower(invited_email) = v_email
    and accepted_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitations (
    space_id, invited_email, invited_by, role, token_hash, expires_at
  ) values (
    p_space_id, v_email, auth.uid(), p_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expires_at
  );

  return query select v_token, v_expires_at;
end;
$$;

revoke all on function public.create_space_invitation(uuid, text, text) from public;
grant execute on function public.create_space_invitation(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- Vista previa de una invitación por token (correo enmascarado)
-- ------------------------------------------------------------
create or replace function public.get_invitation_preview(p_token text)
returns table (
  space_name text,
  role text,
  expires_at timestamptz,
  invited_email text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.name,
    i.role,
    i.expires_at,
    regexp_replace(i.invited_email, '^(.)[^@]*(@.*)$', '\1***\2')
  from public.invitations i
  join public.spaces s on s.id = i.space_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null
    and i.expires_at > now();
$$;

revoke all on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to authenticated;

-- ------------------------------------------------------------
-- Aceptar invitación mediante token
-- ------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation public.invitations%rowtype;
  v_email text := public.current_user_email();
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para aceptar la invitación.' using errcode = 'P0001';
  end if;

  select * into v_invitation
  from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'La invitación no es válida o ha caducado.' using errcode = 'P0001';
  end if;

  if v_email is null or lower(v_invitation.invited_email) <> v_email then
    raise exception 'Esta invitación pertenece a otro correo electrónico.' using errcode = 'P0001';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (v_invitation.space_id, auth.uid(), v_invitation.role)
  on conflict (space_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.space_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

-- ------------------------------------------------------------
-- Rechazar invitación mediante token
-- ------------------------------------------------------------
create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := public.current_user_email();
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = 'P0001';
  end if;

  delete from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and lower(invited_email) = v_email;
end;
$$;

revoke all on function public.decline_invitation(text) from public;
grant execute on function public.decline_invitation(text) to authenticated;

-- ------------------------------------------------------------
-- Invitaciones pendientes del usuario autenticado
-- ------------------------------------------------------------
create or replace function public.get_my_pending_invitations()
returns table (
  invitation_id uuid,
  space_id uuid,
  space_name text,
  role text,
  invited_by_name text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.id,
    i.space_id,
    s.name,
    i.role,
    coalesce(p.display_name, 'Un compañero'),
    i.expires_at,
    i.created_at
  from public.invitations i
  join public.spaces s on s.id = i.space_id
  left join public.profiles p on p.id = i.invited_by
  where lower(i.invited_email) = public.current_user_email()
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at desc;
$$;

revoke all on function public.get_my_pending_invitations() from public;
grant execute on function public.get_my_pending_invitations() to authenticated;

-- ------------------------------------------------------------
-- Aceptar o rechazar una invitación por id (desde el panel)
-- ------------------------------------------------------------
create or replace function public.respond_to_invitation(
  p_invitation_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation public.invitations%rowtype;
  v_email text := public.current_user_email();
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = 'P0001';
  end if;

  select * into v_invitation
  from public.invitations
  where id = p_invitation_id
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'La invitación no es válida o ha caducado.' using errcode = 'P0001';
  end if;

  if v_email is null or lower(v_invitation.invited_email) <> v_email then
    raise exception 'Esta invitación pertenece a otro correo electrónico.' using errcode = 'P0001';
  end if;

  if p_accept then
    insert into public.space_members (space_id, user_id, role)
    values (v_invitation.space_id, auth.uid(), v_invitation.role)
    on conflict (space_id, user_id) do nothing;

    update public.invitations
    set accepted_at = now()
    where id = v_invitation.id;

    return v_invitation.space_id;
  end if;

  delete from public.invitations where id = v_invitation.id;
  return null;
end;
$$;

revoke all on function public.respond_to_invitation(uuid, boolean) from public;
grant execute on function public.respond_to_invitation(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- Compartir explícitamente un recurso personal con una cuenta
-- ------------------------------------------------------------
create or replace function public.share_resource_by_email(
  p_resource_id uuid,
  p_email text,
  p_permission text default 'read'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_target_id uuid;
  v_share_id uuid;
  v_space_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = 'P0001';
  end if;

  if p_permission not in ('read', 'edit') then
    raise exception 'El permiso no es válido.' using errcode = 'P0001';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Escribe un correo electrónico válido.' using errcode = 'P0001';
  end if;

  select r.space_id into v_space_id
  from public.resources r
  where r.id = p_resource_id;

  if not found or not public.can_manage_resource(p_resource_id, auth.uid()) then
    raise exception 'No tienes permisos para compartir este recurso.' using errcode = 'P0001';
  end if;

  if v_space_id is not null then
    raise exception 'Los materiales de un espacio ya están disponibles para sus miembros.'
      using errcode = 'P0001';
  end if;

  select u.id into v_target_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = v_email
  limit 1;

  if v_target_id is null then
    raise exception 'No se pudo compartir el recurso con ese correo.' using errcode = 'P0001';
  end if;

  if v_target_id = auth.uid() then
    raise exception 'El recurso ya es tuyo.' using errcode = 'P0001';
  end if;

  update public.resource_shares
  set permission = p_permission, created_by = auth.uid()
  where resource_id = p_resource_id and shared_with_user_id = v_target_id
  returning id into v_share_id;

  if v_share_id is null then
    insert into public.resource_shares (
      resource_id, shared_with_user_id, space_id, permission, created_by
    ) values (
      p_resource_id, v_target_id, null, p_permission, auth.uid()
    )
    returning id into v_share_id;
  end if;

  return v_share_id;
end;
$$;

revoke all on function public.share_resource_by_email(uuid, text, text) from public;
grant execute on function public.share_resource_by_email(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- 0005_activity.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0005 · Actividad y protección de membresías
-- ============================================================

-- El miembro no puede cambiar de espacio ni de usuario mediante un UPDATE.
create or replace function public.protect_membership_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.space_id is distinct from old.space_id or new.user_id is distinct from old.user_id then
    raise exception 'No se puede mover ni reasignar una membresía' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists space_members_identity_immutable on public.space_members;
create trigger space_members_identity_immutable
  before update on public.space_members
  for each row execute function public.protect_membership_identity();

-- ------------------------------------------------------------
-- Actividad
-- ------------------------------------------------------------
create or replace function public.log_space_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.activity_events (actor_id, space_id, event_type, metadata)
  values (
    auth.uid(),
    new.id,
    'space.created',
    jsonb_build_object('space_name', new.name)
  );
  return new;
end;
$$;

drop trigger if exists spaces_log_created on public.spaces;
create trigger spaces_log_created
  after insert on public.spaces
  for each row execute function public.log_space_created();

create or replace function public.log_member_joined()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role <> 'owner' then
    insert into public.activity_events (actor_id, space_id, event_type, metadata)
    values (
      auth.uid(),
      new.space_id,
      'member.joined',
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists space_members_log_joined on public.space_members;
create trigger space_members_log_joined
  after insert on public.space_members
  for each row execute function public.log_member_joined();

create or replace function public.log_resource_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.activity_events (actor_id, space_id, resource_id, event_type, metadata)
    values (
      v_actor,
      new.space_id,
      new.id,
      'resource.created',
      jsonb_build_object('resource_title', new.title, 'resource_type', new.resource_type)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.activity_events (actor_id, space_id, resource_id, event_type, metadata)
    values (
      v_actor,
      new.space_id,
      new.id,
      'resource.updated',
      jsonb_build_object('resource_title', new.title, 'resource_type', new.resource_type)
    );
    return new;
  else
    insert into public.activity_events (actor_id, space_id, resource_id, event_type, metadata)
    values (
      v_actor,
      old.space_id,
      null,
      'resource.deleted',
      jsonb_build_object('resource_title', old.title, 'resource_type', old.resource_type)
    );
    return old;
  end if;
end;
$$;

drop trigger if exists resources_log_activity on public.resources;
create trigger resources_log_activity
  after insert or update or delete on public.resources
  for each row execute function public.log_resource_activity();

create or replace function public.log_folder_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.activity_events (actor_id, space_id, event_type, metadata)
  values (
    auth.uid(),
    new.space_id,
    'folder.created',
    jsonb_build_object('folder_name', new.name)
  );
  return new;
end;
$$;

drop trigger if exists folders_log_created on public.folders;
create trigger folders_log_created
  after insert on public.folders
  for each row execute function public.log_folder_created();

create or replace function public.log_subject_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.activity_events (actor_id, space_id, event_type, metadata)
  values (
    auth.uid(),
    new.space_id,
    'subject.created',
    jsonb_build_object('subject_name', new.name)
  );
  return new;
end;
$$;

drop trigger if exists subjects_log_created on public.subjects;
create trigger subjects_log_created
  after insert on public.subjects
  for each row execute function public.log_subject_created();

-- ------------------------------------------------------------
-- 0006_realtime.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0006 · Publicación de Realtime
-- Es opcional: si Realtime no está habilitado, la interfaz sigue
-- funcionando con recargas manuales.
-- ============================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.spaces;
    exception when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.space_members;
    exception when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.invitations;
    exception when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.subjects;
    exception when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.folders;
    exception when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.resources;
    exception when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.activity_events;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 0007_storage.sql
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 0008_resource_returning.sql
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 0009_activity_cascade.sql
-- ------------------------------------------------------------

-- ============================================================
-- Compila · 0009 · Actividad al borrar en cascada
-- ============================================================
-- Al borrar un espacio o una cuenta, PostgreSQL elimina en cascada sus
-- recursos. El trigger anterior insertaba un evento con el space_id (o el
-- actor_id) ya eliminado, así que la clave foránea hacía fallar todo el
-- borrado.
--
-- Ahora solo registramos el borrado de un recurso si el espacio y el
-- propietario siguen existiendo. En un borrado en cascada no se genera un
-- evento huérfano y la operación termina correctamente.

create or replace function public.log_resource_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.activity_events (actor_id, space_id, resource_id, event_type, metadata)
    values (
      v_actor,
      new.space_id,
      new.id,
      'resource.created',
      jsonb_build_object('resource_title', new.title, 'resource_type', new.resource_type)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.activity_events (actor_id, space_id, resource_id, event_type, metadata)
    values (
      v_actor,
      new.space_id,
      new.id,
      'resource.updated',
      jsonb_build_object('resource_title', new.title, 'resource_type', new.resource_type)
    );
    return new;
  else
    -- Si el actor ya no existe (borrado de cuenta), el evento quedaría
    -- sin autor; usamos NULL, que la columna permite.
    if v_actor is not null and not exists (
      select 1 from public.profiles p where p.id = v_actor
    ) then
      v_actor := null;
    end if;

    -- El espacio o el propietario pueden haberse eliminado antes que el
    -- recurso dentro de la misma cascada. No insertamos el evento.
    if (old.space_id is not null and not exists (
          select 1 from public.spaces s where s.id = old.space_id
        ))
       or not exists (
          select 1 from public.profiles p where p.id = old.owner_id
        ) then
      return old;
    end if;

    insert into public.activity_events (actor_id, space_id, resource_id, event_type, metadata)
    values (
      v_actor,
      old.space_id,
      null,
      'resource.deleted',
      jsonb_build_object('resource_title', old.title, 'resource_type', old.resource_type)
    );
    return old;
  end if;
end;
$$;
