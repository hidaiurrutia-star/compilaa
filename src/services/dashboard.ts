import { getSupabase } from '../lib/supabase/client';
import type { DashboardData, ResourceWithRelations } from '../types/models';
import { listRecentActivity } from './activity';
import { getMyPendingInvitations } from './invitations';
import { listMySpaces } from './spaces';
import { listSubjects } from './subjects';

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = getSupabase();

  const [subjects, spaces, documentsResult, activity, pendingInvitations] = await Promise.all([
    listSubjects(),
    listMySpaces(userId),
    supabase
      .from('resources')
      .select(
        '*, space:spaces(id, name), subject:subjects(id, name), folder:folders(id, name), owner:profiles(id, display_name)',
      )
      .eq('resource_type', 'document')
      .order('created_at', { ascending: false })
      .limit(4)
      .returns<ResourceWithRelations[]>(),
    listRecentActivity(6),
    getMyPendingInvitations(),
  ]);

  if (documentsResult.error) throw documentsResult.error;

  return {
    subjects,
    spaces,
    recentDocuments: documentsResult.data,
    activity,
    pendingInvitations,
  };
}
