import type { Database } from '../lib/supabase/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Space = Database['public']['Tables']['spaces']['Row'];
export type SpaceMember = Database['public']['Tables']['space_members']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type Subject = Database['public']['Tables']['subjects']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type Resource = Database['public']['Tables']['resources']['Row'];
export type ResourceShare = Database['public']['Tables']['resource_shares']['Row'];
export type ActivityEvent = Database['public']['Tables']['activity_events']['Row'];

export type Scope =
  | { type: 'personal'; id: null }
  | { type: 'space'; id: string };

export interface SpaceSummary extends Space {
  role: SpaceRole;
  memberCount: number;
}

export type SpaceRole = 'owner' | 'editor' | 'viewer';

export interface MemberWithProfile extends SpaceMember {
  profile: Pick<Profile, 'id' | 'display_name'> | null;
}

export interface SubjectOption {
  id: string;
  name: string;
  space_id: string | null;
}

export interface FolderOption {
  id: string;
  name: string;
  space_id: string | null;
  parent_folder_id: string | null;
}

export interface ResourceWithRelations extends Resource {
  space: Pick<Space, 'id' | 'name'> | null;
  subject: Pick<Subject, 'id' | 'name'> | null;
  folder: Pick<Folder, 'id' | 'name'> | null;
  owner: Pick<Profile, 'id' | 'display_name'> | null;
  share_permission?: 'read' | 'edit' | null;
}

export interface ActivityWithRelations extends ActivityEvent {
  actor: Pick<Profile, 'id' | 'display_name'> | null;
  space: Pick<Space, 'id' | 'name'> | null;
}

export interface PendingInvitation {
  invitation_id: string;
  space_id: string;
  space_name: string;
  role: 'editor' | 'viewer';
  invited_by_name: string;
  expires_at: string;
  created_at: string;
}

export interface InvitationPreview {
  space_name: string;
  role: 'editor' | 'viewer';
  expires_at: string;
  invited_email: string;
}

export interface LibraryFilters {
  search: string;
  subjectId: string;
  folderId: string;
  type: '' | ResourceType;
  date: '' | '7d' | '30d' | '90d';
  sort: 'recent' | 'oldest' | 'name';
  scope: '' | 'personal' | 'shared';
}

export type ResourceType = 'note' | 'document';

export interface DashboardData {
  subjects: Subject[];
  spaces: SpaceSummary[];
  recentDocuments: ResourceWithRelations[];
  activity: ActivityWithRelations[];
  pendingInvitations: PendingInvitation[];
}
