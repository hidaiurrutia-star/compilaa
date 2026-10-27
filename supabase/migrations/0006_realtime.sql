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
