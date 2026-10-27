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
