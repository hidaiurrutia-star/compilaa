import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  loginSchema,
  passwordSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from './schemas';

describe('passwordSchema', () => {
  it('acepta contraseñas con letra y número de longitud suficiente', () => {
    expect(passwordSchema.safeParse('clave1234').success).toBe(true);
  });

  it('rechaza contraseñas cortas, sin letras o sin números', () => {
    expect(passwordSchema.safeParse('a1').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('solamenteletras').success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(73) + '1').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('normaliza el correo y exige contraseña', () => {
    const parsed = loginSchema.safeParse({ email: '  alumno@universidad.es ', password: 'algo' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe('alumno@universidad.es');

    expect(loginSchema.safeParse({ email: 'alumno@universidad.es', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'no-es-correo', password: 'algo' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    displayName: 'Ana Pérez',
    email: 'ana@universidad.es',
    password: 'clave1234',
    confirmPassword: 'clave1234',
  };

  it('acepta un registro válido', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('exige que las contraseñas coincidan', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'otra1234' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true);
    }
  });

  it('exige un nombre de al menos dos caracteres', () => {
    expect(registerSchema.safeParse({ ...valid, displayName: 'A' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('valida la confirmación de la nueva contraseña', () => {
    expect(
      resetPasswordSchema.safeParse({ password: 'nueva1234', confirmPassword: 'nueva1234' }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: 'nueva1234', confirmPassword: 'distinta1' }).success,
    ).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('exige que la contraseña nueva sea distinta de la actual', () => {
    const same = changePasswordSchema.safeParse({
      currentPassword: 'actual1234',
      password: 'actual1234',
      confirmPassword: 'actual1234',
    });
    expect(same.success).toBe(false);

    const different = changePasswordSchema.safeParse({
      currentPassword: 'actual1234',
      password: 'nueva1234',
      confirmPassword: 'nueva1234',
    });
    expect(different.success).toBe(true);
  });
});

describe('profileSchema', () => {
  it('recorta y valida el nombre visible', () => {
    const parsed = profileSchema.safeParse({ displayName: '  Ana  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.displayName).toBe('Ana');
    expect(profileSchema.safeParse({ displayName: ' ' }).success).toBe(false);
  });
});
