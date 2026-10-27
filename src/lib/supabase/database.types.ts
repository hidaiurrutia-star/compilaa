export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SpaceRole = 'owner' | 'editor' | 'viewer';
export type ResourceType = 'note' | 'document';
export type SharePermission = 'read' | 'edit';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      space_members: {
        Row: {
          id: string;
          space_id: string;
          user_id: string;
          role: SpaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          user_id: string;
          role: SpaceRole;
          created_at?: string;
        };
        Update: {
          role?: SpaceRole;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          space_id: string;
          invited_email: string;
          invited_by: string;
          role: 'editor' | 'viewer';
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          invited_email: string;
          invited_by: string;
          role: 'editor' | 'viewer';
          token_hash: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          space_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          space_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          space_id: string | null;
          parent_folder_id: string | null;
          subject_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          space_id?: string | null;
          parent_folder_id?: string | null;
          subject_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          subject_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          resource_type: ResourceType;
          owner_id: string;
          space_id: string | null;
          folder_id: string | null;
          subject_id: string | null;
          content: string | null;
          storage_path: string | null;
          mime_type: string | null;
          file_size: number | null;
          created_at: string;
          updated_at: string;
          search_vector: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          resource_type: ResourceType;
          owner_id: string;
          space_id?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          content?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          folder_id?: string | null;
          subject_id?: string | null;
          content?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      resource_shares: {
        Row: {
          id: string;
          resource_id: string;
          shared_with_user_id: string | null;
          space_id: string | null;
          permission: SharePermission;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          shared_with_user_id?: string | null;
          space_id?: string | null;
          permission?: SharePermission;
          created_by: string;
          created_at?: string;
        };
        Update: {
          permission?: SharePermission;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          id: string;
          actor_id: string | null;
          space_id: string | null;
          resource_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          space_id?: string | null;
          resource_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_space_invitation: {
        Args: { p_space_id: string; p_email: string; p_role?: 'editor' | 'viewer' };
        Returns: Array<{ token: string; expires_at: string }>;
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      decline_invitation: {
        Args: { p_token: string };
        Returns: undefined;
      };
      get_invitation_preview: {
        Args: { p_token: string };
        Returns: Array<{
          space_name: string;
          role: 'editor' | 'viewer';
          expires_at: string;
          invited_email: string;
        }>;
      };
      get_my_pending_invitations: {
        Args: Record<string, never>;
        Returns: Array<{
          invitation_id: string;
          space_id: string;
          space_name: string;
          role: 'editor' | 'viewer';
          invited_by_name: string;
          expires_at: string;
          created_at: string;
        }>;
      };
      respond_to_invitation: {
        Args: { p_invitation_id: string; p_accept: boolean };
        Returns: string | null;
      };
      share_resource_by_email: {
        Args: { p_resource_id: string; p_email: string; p_permission?: SharePermission };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
