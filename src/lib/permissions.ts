import type { SpaceRole } from './supabase/database.types';

const ROLE_RANK: Record<SpaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export const ROLE_LABELS: Record<SpaceRole, string> = {
  owner: 'Propietario',
  editor: 'Editor',
  viewer: 'Lector',
};

export const ROLE_DESCRIPTIONS: Record<SpaceRole, string> = {
  owner: 'Administra el espacio, sus miembros y todo el contenido.',
  editor: 'Crea y modifica contenido dentro del espacio.',
  viewer: 'Solo puede consultar el contenido compartido.',
};

export function hasAtLeastRole(role: SpaceRole | null | undefined, minimum: SpaceRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canEditSpace(role: SpaceRole | null | undefined): boolean {
  return hasAtLeastRole(role, 'editor');
}

export function canManageSpace(role: SpaceRole | null | undefined): boolean {
  return role === 'owner';
}

export function canInviteMembers(role: SpaceRole | null | undefined): boolean {
  return role === 'owner';
}

export function canManageMembers(role: SpaceRole | null | undefined): boolean {
  return role === 'owner';
}

interface ResourceAccessInput {
  ownerId: string;
  spaceId: string | null;
  userId: string;
  spaceRole: SpaceRole | null | undefined;
  sharePermission?: 'read' | 'edit' | null;
}

export function canReadResource(input: ResourceAccessInput): boolean {
  if (input.ownerId === input.userId) return true;
  if (input.spaceId && input.spaceRole) return true;
  return input.sharePermission === 'read' || input.sharePermission === 'edit';
}

export function canEditResource(input: ResourceAccessInput): boolean {
  if (input.ownerId === input.userId) return true;
  if (input.spaceId && canEditSpace(input.spaceRole)) return true;
  return input.sharePermission === 'edit';
}

export function canDeleteResource(input: ResourceAccessInput): boolean {
  if (input.ownerId === input.userId) return true;
  return Boolean(input.spaceId && canEditSpace(input.spaceRole));
}

export interface ResourcePermissions {
  canRead: boolean;
  canEdit: boolean;
  canMove: boolean;
  canDelete: boolean;
  canShare: boolean;
}

/**
 * Resume las acciones disponibles en la interfaz. La autorización real la
 * aplica siempre RLS y las funciones SQL; esto solo evita ofrecer acciones
 * que el servidor rechazaría.
 */
export function getResourcePermissions(input: ResourceAccessInput): ResourcePermissions {
  const canManage = canDeleteResource(input);
  return {
    canRead: canReadResource(input),
    canEdit: canEditResource(input),
    canMove: canManage,
    canDelete: canManage,
    canShare: input.ownerId === input.userId && input.spaceId === null,
  };
}
