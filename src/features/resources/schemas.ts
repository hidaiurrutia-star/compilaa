import { z } from 'zod';

export const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Escribe un título.')
    .max(200, 'El título no puede superar los 200 caracteres.'),
  description: z.string().trim().max(4000, 'La descripción es demasiado larga.').optional(),
  content: z
    .string()
    .min(1, 'La nota no puede estar vacía.')
    .max(200000, 'La nota es demasiado larga.'),
  subjectId: z.string().optional(),
  folderId: z.string().optional(),
});
export type NoteValues = z.infer<typeof noteSchema>;
