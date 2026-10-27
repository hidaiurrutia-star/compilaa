import { getSupabase } from '../lib/supabase/client';
import type { ActivityWithRelations } from '../types/models';

export async function listRecentActivity(limit = 8): Promise<ActivityWithRelations[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('activity_events')
    .select(
      '*, actor:profiles!activity_events_actor_id_fkey(id, display_name), space:spaces!activity_events_space_id_fkey(id, name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ActivityWithRelations[]>();

  if (error) throw error;
  return data;
}

export function describeActivity(event: ActivityWithRelations): string {
  const metadata = event.metadata;
  const resourceTitle =
    typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) &&
    typeof metadata.resource_title === 'string'
      ? metadata.resource_title
      : null;
  const folderName =
    typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) &&
    typeof metadata.folder_name === 'string'
      ? metadata.folder_name
      : null;
  const subjectName =
    typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) &&
    typeof metadata.subject_name === 'string'
      ? metadata.subject_name
      : null;

  switch (event.event_type) {
    case 'resource.created':
      return resourceTitle ? `creó «${resourceTitle}»` : 'creó un recurso';
    case 'resource.updated':
      return resourceTitle ? `actualizó «${resourceTitle}»` : 'actualizó un recurso';
    case 'resource.deleted':
      return resourceTitle ? `eliminó «${resourceTitle}»` : 'eliminó un recurso';
    case 'folder.created':
      return folderName ? `creó la carpeta «${folderName}»` : 'creó una carpeta';
    case 'subject.created':
      return subjectName ? `creó la asignatura «${subjectName}»` : 'creó una asignatura';
    case 'space.created':
      return 'creó el espacio';
    case 'member.joined':
      return 'se unió al espacio';
    default:
      return 'realizó un cambio';
  }
}
