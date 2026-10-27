import { getSupabase } from '../lib/supabase/client';
import type { Subject } from '../types/models';

export async function listSubjects(): Promise<Subject[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('subjects').select('*').order('name', {
    ascending: true,
  });
  if (error) throw error;
  return data;
}

export async function listSubjectsForSpace(spaceId: string): Promise<Subject[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('space_id', spaceId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function listPersonalSubjects(userId: string): Promise<Subject[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .is('space_id', null)
    .eq('owner_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSubject(input: {
  name: string;
  description?: string;
  ownerId: string;
  spaceId: string | null;
}): Promise<Subject> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      owner_id: input.ownerId,
      space_id: input.spaceId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(
  subjectId: string,
  input: { name: string; description?: string },
): Promise<Subject> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('subjects')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .eq('id', subjectId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
  if (error) throw error;
}

export async function countResourcesBySubject(): Promise<Record<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resources')
    .select('subject_id')
    .not('subject_id', 'is', null);

  if (error) throw error;
  return data.reduce<Record<string, number>>((counts, row) => {
    if (!row.subject_id) return counts;
    counts[row.subject_id] = (counts[row.subject_id] ?? 0) + 1;
    return counts;
  }, {});
}
