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
