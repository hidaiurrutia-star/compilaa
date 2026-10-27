import { getSupabase } from '../lib/supabase/client';
import type { Folder, Scope } from '../types/models';

export async function listFolders(scope: Scope, userId: string): Promise<Folder[]> {
  const supabase = getSupabase();
  let query = supabase.from('folders').select('*').order('name', { ascending: true });

  if (scope.type === 'personal') {
    query = query.is('space_id', null).eq('owner_id', userId);
  } else {
    query = query.eq('space_id', scope.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listAccessibleFolders(): Promise<Folder[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFolder(input: {
  name: string;
  ownerId: string;
  spaceId: string | null;
  parentFolderId?: string | null;
  subjectId?: string | null;
}): Promise<Folder> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('folders')
    .insert({
      name: input.name.trim(),
      owner_id: input.ownerId,
      space_id: input.spaceId,
      parent_folder_id: input.parentFolderId ?? null,
      subject_id: input.subjectId ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function renameFolder(folderId: string, name: string): Promise<Folder> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('folders')
    .update({ name: name.trim() })
    .eq('id', folderId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFolder(folderId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('folders').delete().eq('id', folderId);
  if (error) throw error;
}

export function getFolderPath(folders: Folder[], folderId: string | null): Folder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: Folder[] = [];
  let current = byId.get(folderId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parent_folder_id ? byId.get(current.parent_folder_id) : undefined;
  }

  return path;
}
