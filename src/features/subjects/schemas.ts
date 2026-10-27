import { z } from 'zod';

export const subjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre de la asignatura.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  description: z
    .string()
    .trim()
    .max(2000, 'La descripción no puede superar los 2000 caracteres.')
    .optional(),
  scopeId: z.string(),
});
export type SubjectValues = z.infer<typeof subjectSchema>;
