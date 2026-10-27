const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  isConfigured: boolean;
  error: string | null;
}

export function validateSupabaseUrl(value: string): string | null {
  if (!value) return 'Falta VITE_SUPABASE_URL.';
  if (value.includes('/rest/v1')) {
    return 'VITE_SUPABASE_URL debe ser la URL base del proyecto, sin /rest/v1.';
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return 'VITE_SUPABASE_URL debe usar https (o localhost para desarrollo local).';
    }
    return null;
  } catch {
    return 'VITE_SUPABASE_URL no es una URL válida.';
  }
}

const urlError = validateSupabaseUrl(rawUrl);
const keyError = rawKey ? null : 'Falta VITE_SUPABASE_PUBLISHABLE_KEY.';

export const supabaseConfig: SupabaseConfig = {
  url: rawUrl.replace(/\/+$/, ''),
  publishableKey: rawKey,
  isConfigured: !urlError && !keyError,
  error: urlError ?? keyError,
};
