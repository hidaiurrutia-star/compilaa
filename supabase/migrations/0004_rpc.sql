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
