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
