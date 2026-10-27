import { useEffect, useRef } from 'react';
import { getSupabase } from '../lib/supabase/client';

interface RealtimeTable {
  table: string;
  filter?: string;
}

/**
 * Suscripción opcional a cambios de Supabase Realtime. Si Realtime no está
 * habilitado en el proyecto, la interfaz sigue funcionando con recargas manuales.
 */
export function useRealtimeRefresh(
  tables: RealtimeTable[],
  channelName: string,
  onChange: () => void,
  enabled = true,
): void {
  const tablesRef = useRef(tables);
  const signature = tables.map((item) => `${item.table}:${item.filter ?? '*'}`).join('|');

  // Actualiza las tablas fuera del render; la suscripción depende de la firma.
  useEffect(() => {
    tablesRef.current = tables;
  });

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    let channel = supabase.channel(channelName);

    for (const item of tablesRef.current) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: item.table,
          ...(item.filter ? { filter: item.filter } : {}),
        },
        () => onChange(),
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, enabled, onChange, signature]);
}
