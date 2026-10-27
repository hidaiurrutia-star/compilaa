import { getSupabase } from '../lib/supabase/client';
import type { Invitation, InvitationPreview, PendingInvitation } from '../types/models';

export interface CreatedInvitation {
  token: string;
  expiresAt: string;
  inviteUrl: string;
}

function buildInviteUrl(token: string): string {
  return `${window.location.origin}/invitaciones/${token}`;
}

export async function createInvitation(
  spaceId: string,
  email: string,
  role: 'editor' | 'viewer',
): Promise<CreatedInvitation> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('create_space_invitation', {
    p_space_id: spaceId,
    p_email: email.trim().toLowerCase(),
    p_role: role,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.token) throw new Error('No se pudo generar la invitación.');

  return {
    token: row.token,
    expiresAt: row.expires_at,
    inviteUrl: buildInviteUrl(row.token),
  };
}

export async function listSpaceInvitations(spaceId: string): Promise<Invitation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('space_id', spaceId)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('invitations').delete().eq('id', invitationId);
  if (error) throw error;
}

export async function acceptInvitation(token: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw error;
  if (!data) throw new Error('La invitación no es válida o ha caducado.');
  return data;
}

export async function declineInvitation(token: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('decline_invitation', { p_token: token });
  if (error) throw error;
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_invitation_preview', { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error('La invitación no es válida o ha caducado.');
  return row;
}

export async function getMyPendingInvitations(): Promise<PendingInvitation[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_my_pending_invitations', {});
  if (error) throw error;
  return data ?? [];
}

export async function respondToInvitation(invitationId: string, accept: boolean): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('respond_to_invitation', {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
  if (error) throw error;
  return data;
}
