import { getSupabase } from '../lib/supabase/client';
import { STORAGE_BUCKET } from '../lib/constants';
import type { MemberWithProfile, Space, SpaceRole, SpaceSummary } from '../types/models';

interface SpaceDetails {
  space: Space;
  role: SpaceRole;
  members: MemberWithProfile[];
}

export async function listMySpaces(userId: string): Promise<SpaceSummary[]> {
  const supabase = getSupabase();
  const { data: memberships, error } = await supabase
    .from('space_members')
    .select('space_id, role')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!memberships.length) return [];

  const spaceIds = memberships.map((membership) => membership.space_id);

  const [spacesResult, membersResult] = await Promise.all([
    supabase.from('spaces').select('*').in('id', spaceIds),
    supabase.from('space_members').select('space_id').in('space_id', spaceIds),
  ]);

  if (spacesResult.error) throw spacesResult.error;
  if (membersResult.error) throw membersResult.error;

  const memberCounts = new Map<string, number>();
  for (const member of membersResult.data) {
    memberCounts.set(member.space_id, (memberCounts.get(member.space_id) ?? 0) + 1);
  }

  const spacesById = new Map(spacesResult.data.map((space) => [space.id, space]));

  return memberships
    .map((membership) => {
      const space = spacesById.get(membership.space_id);
      if (!space) return null;
      return {
        ...space,
        role: membership.role,
        memberCount: memberCounts.get(space.id) ?? 1,
      } satisfies SpaceSummary;
    })
    .filter((space): space is SpaceSummary => space !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function listSpaceMembers(spaceId: string): Promise<MemberWithProfile[]> {
  const supabase = getSupabase();
  const { data: members, error } = await supabase
    .from('space_members')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!members.length) return [];

  const userIds = [...new Set(members.map((member) => member.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);

  if (profilesError) throw profilesError;
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return members
    .map((member) => ({
      ...member,
      profile: profilesById.get(member.user_id) ?? null,
    }))
    .sort((a, b) => {
      const rank: Record<SpaceRole, number> = { owner: 0, editor: 1, viewer: 2 };
      return rank[a.role] - rank[b.role] || a.created_at.localeCompare(b.created_at);
    });
}

export async function getSpaceDetails(spaceId: string, userId: string): Promise<SpaceDetails> {
  const supabase = getSupabase();
  const { data: space, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', spaceId)
    .maybeSingle();

  if (error) throw error;
  if (!space) throw new Error('El espacio no existe o no tienes acceso a él.');

  const { data: membership, error: membershipError } = await supabase
    .from('space_members')
    .select('role')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error('No perteneces a este espacio.');

  const members = await listSpaceMembers(spaceId);
  return { space, role: membership.role, members };
}

export async function getSpaceRole(spaceId: string, userId: string): Promise<SpaceRole | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('space_members')
    .select('role')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}

interface CreateSpaceInput {
  name: string;
  description?: string;
  ownerId: string;
  subjectNames?: string[];
}

export async function createSpace({
  name,
  description,
  ownerId,
  subjectNames = [],
}: CreateSpaceInput): Promise<Space> {
  const supabase = getSupabase();
  const { data: space, error } = await supabase
    .from('spaces')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: ownerId,
    })
    .select('*')
    .single();

  if (error) throw error;

  const cleanSubjects = subjectNames
    .map((subject) => subject.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (cleanSubjects.length) {
    const { error: subjectsError } = await supabase.from('subjects').insert(
      cleanSubjects.map((subjectName) => ({
        name: subjectName,
        owner_id: ownerId,
        space_id: space.id,
      })),
    );

    if (subjectsError) {
      await supabase.from('spaces').delete().eq('id', space.id);
      throw subjectsError;
    }
  }

  return space;
}

export async function updateSpace(
  spaceId: string,
  input: { name: string; description?: string },
): Promise<Space> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('spaces')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .eq('id', spaceId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSpaceWithFiles(spaceId: string): Promise<void> {
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Debes iniciar sesión.');

  const role = await getSpaceRole(spaceId, authData.user.id);
  if (role !== 'owner') {
    throw new Error('Solo el propietario puede eliminar el espacio.');
  }

  const { data: files, error: filesError } = await supabase
    .from('resources')
    .select('storage_path')
    .eq('space_id', spaceId)
    .not('storage_path', 'is', null);

  if (filesError) throw filesError;

  const paths = files
    .map((file) => file.storage_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    if (storageError) {
      throw new Error(
        'No se pudieron eliminar los archivos del espacio. No se borró el espacio para evitar dejar archivos huérfanos.',
      );
    }
  }

  const { data: deleted, error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', spaceId)
    .select('id');

  if (error) throw error;
  if (!deleted.length) throw new Error('No se pudo eliminar el espacio.');
}

export async function updateMemberRole(spaceId: string, userId: string, role: 'editor' | 'viewer') {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('space_members')
    .update({ role })
    .eq('space_id', spaceId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function removeMember(spaceId: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function leaveSpace(spaceId: string, userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', userId);

  if (error) throw error;
}
