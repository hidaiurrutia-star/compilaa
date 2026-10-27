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
