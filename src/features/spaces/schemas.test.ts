import { describe, expect, it } from 'vitest';
import { inviteMemberSchema, spaceSchema } from './schemas';

describe('spaceSchema', () => {
  it('valida el nombre y la descripción', () => {
    expect(spaceSchema.safeParse({ name: 'Grupo de Cálculo', description: 'Apuntes y parciales' }).success).toBe(
      true,
    );
    expect(spaceSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(spaceSchema.safeParse({ name: 'a'.repeat(121) }).success).toBe(false);
  });
});

describe('inviteMemberSchema', () => {
  it('solo permite invitar como editor o lector', () => {
    expect(inviteMemberSchema.safeParse({ email: 'compa@uni.es', role: 'editor' }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ email: 'compa@uni.es', role: 'viewer' }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ email: 'compa@uni.es', role: 'owner' }).success).toBe(false);
  });

  it('valida el correo', () => {
    expect(inviteMemberSchema.safeParse({ email: 'no-es-correo', role: 'viewer' }).success).toBe(false);
  });
});
