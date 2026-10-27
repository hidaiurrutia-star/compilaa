import { describe, expect, it } from 'vitest';
import { validateSupabaseUrl } from './config';

describe('validateSupabaseUrl', () => {
  it('acepta la URL base HTTPS de un proyecto', () => {
    expect(validateSupabaseUrl('https://abcdefgh.supabase.co')).toBeNull();
  });

  it('acepta localhost para desarrollo local', () => {
    expect(validateSupabaseUrl('http://localhost:54321')).toBeNull();
    expect(validateSupabaseUrl('http://127.0.0.1:54321')).toBeNull();
  });

  it('rechaza URLs vacías o inválidas', () => {
    expect(validateSupabaseUrl('')).toContain('Falta VITE_SUPABASE_URL');
    expect(validateSupabaseUrl('no-es-una-url')).toContain('no es una URL válida');
  });

  it('rechaza HTTP fuera de localhost', () => {
    expect(validateSupabaseUrl('http://mi-proyecto.supabase.co')).toContain('https');
  });

  it('rechaza la URL de la API REST', () => {
    expect(validateSupabaseUrl('https://mi-proyecto.supabase.co/rest/v1')).toContain('/rest/v1');
  });
});
