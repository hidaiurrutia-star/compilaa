import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../lib/utils';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
  setData: (data: T | null) => void;
}

/**
 * Carga datos de Supabase con estados de carga/error y una clave estable
 * que identifica los filtros de la consulta.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  key = 'default',
  options: { enabled?: boolean; fallbackError?: string } = {},
): AsyncState<T> {
  const { enabled = true, fallbackError = 'No se pudieron cargar los datos.' } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshKey, setRefreshKey] = useState(0);
  const loaderRef = useRef(loader);
  const previousKeyRef = useRef(key);

  // Mantiene la referencia al cargador actualizada fuera del render. Este efecto
  // se declara antes del de carga para que se ejecute primero en cada commit.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) return;

    if (previousKeyRef.current !== key) {
      setData(null);
      previousKeyRef.current = key;
    }

    let active = true;
    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(getErrorMessage(loadError, fallbackError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key, refreshKey, enabled, fallbackError]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  // Evita el parpadeo de un estado vacío entre que se habilita la consulta y
  // arranca el efecto de carga.
  const isLoading = enabled && (loading || (data === null && error === null));

  return { data, error, loading: isLoading, refresh, setData };
}
