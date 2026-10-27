import { describe, expect, it } from 'vitest';
import {
  canDeleteResource,
  canEditResource,
  canEditSpace,
  canInviteMembers,
  canManageMembers,
  canManageSpace,
  canReadResource,
  getResourcePermissions,
  hasAtLeastRole,
  ROLE_LABELS,
} from './permissions';

const baseAccess = {
  ownerId: 'user-owner',
  spaceId: null,
  userId: 'user-owner',
  spaceRole: null,
};

describe('roles de espacio', () => {
  it('ordena los roles de menor a mayor privilegio', () => {
    expect(hasAtLeastRole('viewer', 'viewer')).toBe(true);
    expect(hasAtLeastRole('viewer', 'editor')).toBe(false);
    expect(hasAtLeastRole('editor', 'editor')).toBe(true);
    expect(hasAtLeastRole('owner', 'editor')).toBe(true);
    expect(hasAtLeastRole(null, 'viewer')).toBe(false);
  });

  it('permite editar a editores y propietarios', () => {
    expect(canEditSpace('owner')).toBe(true);
    expect(canEditSpace('editor')).toBe(true);
    expect(canEditSpace('viewer')).toBe(false);
    expect(canEditSpace(undefined)).toBe(false);
  });

  it('reserva la administración y las invitaciones al propietario', () => {
    expect(canManageSpace('owner')).toBe(true);
    expect(canManageSpace('editor')).toBe(false);
    expect(canInviteMembers('owner')).toBe(true);
    expect(canInviteMembers('editor')).toBe(false);
    expect(canManageMembers('owner')).toBe(true);
    expect(canManageMembers('viewer')).toBe(false);
  });

  it('expone etiquetas en español', () => {
    expect(ROLE_LABELS).toEqual({ owner: 'Propietario', editor: 'Editor', viewer: 'Lector' });
  });
});

describe('acceso a recursos', () => {
  it('el propietario puede leer, editar y borrar su recurso personal', () => {
    expect(canReadResource(baseAccess)).toBe(true);
    expect(canEditResource(baseAccess)).toBe(true);
    expect(canDeleteResource(baseAccess)).toBe(true);
    expect(getResourcePermissions(baseAccess)).toEqual({
      canRead: true,
      canEdit: true,
      canMove: true,
      canDelete: true,
      canShare: true,
    });
  });

  it('un lector de espacio solo puede leer', () => {
    const access = { ...baseAccess, ownerId: 'otra-persona', spaceId: 'space-1', spaceRole: 'viewer' as const };
    expect(canReadResource(access)).toBe(true);
    expect(canEditResource(access)).toBe(false);
    expect(canDeleteResource(access)).toBe(false);
    expect(getResourcePermissions(access).canShare).toBe(false);
  });

  it('un editor de espacio puede editar y borrar, pero no compartir fuera del espacio', () => {
    const access = { ...baseAccess, ownerId: 'otra-persona', spaceId: 'space-1', spaceRole: 'editor' as const };
    expect(canEditResource(access)).toBe(true);
    expect(canDeleteResource(access)).toBe(true);
    expect(getResourcePermissions(access).canShare).toBe(false);
  });

  it('un recurso compartido directamente respeta el permiso de lectura o edición', () => {
    const readAccess = {
      ...baseAccess,
      ownerId: 'otra-persona',
      sharePermission: 'read' as const,
    };
    expect(canReadResource(readAccess)).toBe(true);
    expect(canEditResource(readAccess)).toBe(false);
    expect(canDeleteResource(readAccess)).toBe(false);

    const editAccess = {
      ...baseAccess,
      ownerId: 'otra-persona',
      sharePermission: 'edit' as const,
    };
    expect(canEditResource(editAccess)).toBe(true);
    expect(canDeleteResource(editAccess)).toBe(false);
    expect(getResourcePermissions(editAccess).canShare).toBe(false);
  });

  it('niega el acceso sin relación con el recurso', () => {
    const access = { ...baseAccess, ownerId: 'otra-persona', userId: 'tercera-persona' };
    expect(canReadResource(access)).toBe(false);
    expect(canEditResource(access)).toBe(false);
    expect(canDeleteResource(access)).toBe(false);
  });
});
