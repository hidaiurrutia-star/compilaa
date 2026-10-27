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
