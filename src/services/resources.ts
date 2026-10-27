import { getSupabase } from '../lib/supabase/client';
import {
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  PAGE_SIZE,
  STORAGE_BUCKET,
  isAllowedFile,
  sanitizeFileName,
} from '../lib/constants';
import type {
  LibraryFilters,
  ResourceShare,
  ResourceWithRelations,
  Scope,
  SpaceRole,
} from '../types/models';
import type { SharePermission } from '../lib/supabase/database.types';
import { getSpaceRole } from './spaces';

const RESOURCE_SELECT =
  '*, space:spaces(id, name), subject:subjects(id, name), folder:folders(id, name), owner:profiles(id, display_name)';

export interface ResourcePage {
  items: ResourceWithRelations[];
  total: number;
  hasMore: boolean;
}

export interface ResourceAccess {
  resource: ResourceWithRelations;
  spaceRole: SpaceRole | null;
  sharePermission: SharePermission | null;
}

export async function listAccessibleResources(
  filters: LibraryFilters,
  _userId: string,
  page = 0,
): Promise<ResourcePage> {
  const supabase = getSupabase();
  let query = supabase
    .from('resources')
    .select(RESOURCE_SELECT, { count: 'exact' })
    .order(filters.sort === 'name' ? 'title' : 'created_at', {
      ascending: filters.sort === 'name' || filters.sort === 'oldest',
    })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (filters.scope === 'personal') {
    // Incluye los recursos personales propios y los compartidos directamente
    // contigo. RLS limita el resultado a lo que realmente puedes leer.
    query = query.is('space_id', null);
  } else if (filters.scope === 'shared') {
    query = query.not('space_id', 'is', null);
  }

  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);
  if (filters.folderId) query = query.eq('folder_id', filters.folderId);
  if (filters.type) query = query.eq('resource_type', filters.type);

  if (filters.date) {
    const days = filters.date === '7d' ? 7 : filters.date === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const term = filters.search.trim();
  if (term) {
    query = query.textSearch('search_vector', term, { config: 'spanish', type: 'websearch' });
  }

  const { data, error, count } = await query.returns<ResourceWithRelations[]>();
  if (error) throw error;

  return {
    items: data,
    total: count ?? data.length,
    hasMore: (count ?? data.length) > (page + 1) * PAGE_SIZE,
  };
}

interface ScopeResourceOptions {
  folderId?: string | null;
  search?: string;
  page?: number;
}

export async function listScopeResources(
  scope: Scope,
  userId: string,
  options: ScopeResourceOptions = {},
): Promise<ResourcePage> {
  const supabase = getSupabase();
  const page = options.page ?? 0;
  let query = supabase
    .from('resources')
    .select(RESOURCE_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (scope.type === 'personal') {
    query = query.is('space_id', null).eq('owner_id', userId);
  } else {
    query = query.eq('space_id', scope.id);
  }

  if (options.folderId) {
    query = query.eq('folder_id', options.folderId);
  }

  const term = options.search?.trim();
  if (term) {
    query = query.textSearch('search_vector', term, { config: 'spanish', type: 'websearch' });
  }

  const { data, error, count } = await query.returns<ResourceWithRelations[]>();
  if (error) throw error;

  return {
    items: data,
    total: count ?? data.length,
    hasMore: (count ?? data.length) > (page + 1) * PAGE_SIZE,
  };
}

export async function getResourceWithAccess(
  resourceId: string,
  userId: string,
): Promise<ResourceAccess> {
  const supabase = getSupabase();
  const { data: resource, error } = await supabase
    .from('resources')
    .select(RESOURCE_SELECT)
    .eq('id', resourceId)
    .maybeSingle()
    .returns<ResourceWithRelations>();

  if (error) throw error;
  if (!resource) throw new Error('El recurso no existe o ya no tienes acceso a él.');

  let spaceRole: SpaceRole | null = null;
  let sharePermission: SharePermission | null = null;

  if (resource.space_id) {
    spaceRole = await getSpaceRole(resource.space_id, userId);
  } else if (resource.owner_id !== userId) {
    const { data: share, error: shareError } = await supabase
      .from('resource_shares')
      .select('permission')
      .eq('resource_id', resourceId)
      .eq('shared_with_user_id', userId)
      .maybeSingle();
    if (shareError) throw shareError;
    sharePermission = share?.permission ?? null;
  }

  return { resource, spaceRole, sharePermission };
}

export async function createNote(input: {
  title: string;
  description?: string;
  content: string;
  ownerId: string;
  spaceId: string | null;
  folderId?: string | null;
  subjectId?: string | null;
}): Promise<ResourceWithRelations> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resources')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content: input.content,
      resource_type: 'note',
      owner_id: input.ownerId,
      space_id: input.spaceId,
      folder_id: input.folderId ?? null,
      subject_id: input.subjectId ?? null,
    })
    .select(RESOURCE_SELECT)
    .single()
    .returns<ResourceWithRelations>();

  if (error) throw error;
  return data;
}

export async function updateResource(
  resourceId: string,
  patch: {
    title?: string;
    description?: string | null;
    content?: string | null;
    folder_id?: string | null;
    subject_id?: string | null;
  },
): Promise<ResourceWithRelations> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resources')
    .update({
      ...patch,
      ...(typeof patch.title === 'string' ? { title: patch.title.trim() } : {}),
      ...(typeof patch.description === 'string' ? { description: patch.description.trim() || null } : {}),
    })
    .eq('id', resourceId)
    .select(RESOURCE_SELECT)
    .single()
    .returns<ResourceWithRelations>();

  if (error) throw error;
  return data;
}

export async function deleteResource(resourceId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: resource, error } = await supabase
    .from('resources')
    .select('storage_path')
    .eq('id', resourceId)
    .maybeSingle();

  if (error) throw error;
  if (!resource) throw new Error('El recurso no existe o ya no tienes acceso a él.');

  const { data: deleted, error: deleteError } = await supabase
    .from('resources')
    .delete()
    .eq('id', resourceId)
    .select('id');

  if (deleteError) throw deleteError;
  if (!deleted.length) throw new Error('No tienes permisos para eliminar este material.');

  if (resource.storage_path) {
    // La fila ya está borrada; si falla la limpieza del archivo no conviene
    // mostrar un error que haría pensar que el material sigue existiendo.
    await supabase.storage.from(STORAGE_BUCKET).remove([resource.storage_path]);
  }
}

export async function uploadDocument(input: {
  file: File;
  title: string;
  description?: string;
  ownerId: string;
  spaceId: string | null;
  folderId?: string | null;
  subjectId?: string | null;
}): Promise<ResourceWithRelations> {
  const { file } = input;

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`El archivo supera el límite de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }
  if (file.size === 0) {
    throw new Error('El archivo está vacío.');
  }
  if (!isAllowedFile(file)) {
    throw new Error('Tipo de archivo no permitido. Revisa los formatos aceptados.');
  }

  const supabase = getSupabase();
  const scopePrefix = input.spaceId ? `s/${input.spaceId}` : `u/${input.ownerId}`;
  const storagePath = `${scopePrefix}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const allowed = ACCEPTED_FILE_TYPES[file.type as keyof typeof ACCEPTED_FILE_TYPES];
  const contentType =
    file.type && allowed
      ? file.type
      : 'application/octet-stream';

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });

  if (uploadError) {
    throw new Error('No se pudo subir el archivo. Comprueba que el almacenamiento esté configurado.');
  }

  const { data, error } = await supabase
    .from('resources')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      resource_type: 'document',
      owner_id: input.ownerId,
      space_id: input.spaceId,
      folder_id: input.folderId ?? null,
      subject_id: input.subjectId ?? null,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select(RESOURCE_SELECT)
    .single()
    .returns<ResourceWithRelations>();

  if (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw error;
  }

  return data;
}

export async function createDownloadUrl(resource: ResourceWithRelations): Promise<string> {
  if (!resource.storage_path) {
    throw new Error('Este recurso no tiene un archivo asociado.');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(resource.storage_path, 60 * 10, { download: true });

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Permisos de edición que otras personas han concedido al usuario actual
 * sobre recursos personales. Se usa para mostrar acciones coherentes en la
 * biblioteca sin exponer datos de recursos no accesibles.
 */
export async function listMySharePermissions(
  userId: string,
): Promise<Record<string, SharePermission>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('resource_shares')
    .select('resource_id, permission')
    .eq('shared_with_user_id', userId);

  if (error) throw error;

  return data.reduce<Record<string, SharePermission>>((permissions, share) => {
    permissions[share.resource_id] = share.permission;
    return permissions;
  }, {});
}

export async function shareResourceByEmail(
  resourceId: string,
  email: string,
  permission: SharePermission,
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('share_resource_by_email', {
    p_resource_id: resourceId,
    p_email: email.trim().toLowerCase(),
    p_permission: permission,
  });

  if (error) throw error;
  if (!data) throw new Error('No se pudo compartir el recurso.');
  return data;
}

export interface ShareWithUser extends ResourceShare {
  user: { id: string; display_name: string } | null;
}

export async function listResourceShares(resourceId: string): Promise<ShareWithUser[]> {
  const supabase = getSupabase();
  const { data: shares, error } = await supabase
    .from('resource_shares')
    .select('*')
    .eq('resource_id', resourceId)
    .not('shared_with_user_id', 'is', null);

  if (error) throw error;

  const userIds = shares
    .map((share) => share.shared_with_user_id)
    .filter((id): id is string => Boolean(id));

  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  if (profilesError) throw profilesError;
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return shares.map((share) => ({
    ...share,
    user: share.shared_with_user_id ? profilesById.get(share.shared_with_user_id) ?? null : null,
  }));
}

export async function revokeResourceShare(shareId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('resource_shares').delete().eq('id', shareId);
  if (error) throw error;
}
