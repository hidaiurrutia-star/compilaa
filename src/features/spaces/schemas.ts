import { z } from 'zod';

export const spaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe un nombre para el espacio.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  description: z
    .string()
    .trim()
    .max(2000, 'La descripción no puede superar los 2000 caracteres.')
    .optional(),
  subjects: z
    .string()
    .trim()
    .max(300, 'Añade como máximo unas pocas asignaturas iniciales.')
    .optional(),
});
export type SpaceValues = z.infer<typeof spaceSchema>;

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribe el correo de la persona.')
    .email('Escribe un correo electrónico válido.')
    .max(254, 'El correo es demasiado largo.'),
  role: z.enum(['editor', 'viewer']),
});
export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
