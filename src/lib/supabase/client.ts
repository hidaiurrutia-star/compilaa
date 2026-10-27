import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabaseConfig } from './config';

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

/**
 * Devuelve el cliente único de Supabase.
 * La sesión se persiste mediante el mecanismo oficial de Supabase Auth
 * (nunca guardamos tokens manualmente).
 */
export function getSupabase(): TypedSupabaseClient {
  if (!supabaseConfig.isConfigured) {
    throw new Error(
      'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  if (!client) {
    client = createClient<Database>(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }

  return client;
}
