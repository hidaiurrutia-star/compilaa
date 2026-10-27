import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Escribe tu correo electrónico.')
  .email('Escribe un correo electrónico válido.')
  .max(254, 'El correo es demasiado largo.');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .regex(/[A-Za-z]/, 'Incluye al menos una letra.')
  .regex(/[0-9]/, 'Incluye al menos un número.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Escribe tu contraseña.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(60, 'El nombre no puede superar los 60 caracteres.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(60, 'El nombre no puede superar los 60 caracteres.');

export const profileSchema = z.object({
  displayName: displayNameSchema,
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Escribe tu contraseña actual.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña nueva.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  })
  .refine((values) => values.password !== values.currentPassword, {
    path: ['password'],
    message: 'La contraseña nueva debe ser diferente de la actual.',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
