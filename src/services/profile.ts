import { getSupabase } from '../lib/supabase/client';
import type { Profile } from '../types/models';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureProfile(userId: string, fallbackName: string): Promise<Profile> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, display_name: fallbackName.trim() || 'Estudiante' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
