import { describe, expect, it } from 'vitest';
import { noteSchema } from './schemas';

describe('noteSchema', () => {
  it('acepta una nota con título y contenido', () => {
    const parsed = noteSchema.safeParse({
      title: '  Derivadas parciales  ',
      content: 'Contenido de la nota.',
      subjectId: '',
      folderId: '',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.title).toBe('Derivadas parciales');
  });

  it('exige título y contenido', () => {
    expect(noteSchema.safeParse({ title: '', content: 'algo' }).success).toBe(false);
    expect(noteSchema.safeParse({ title: 'Título', content: '' }).success).toBe(false);
  });

  it('limita la longitud del título y la descripción', () => {
    expect(noteSchema.safeParse({ title: 'a'.repeat(201), content: 'algo' }).success).toBe(false);
    expect(
      noteSchema.safeParse({ title: 'Título', content: 'algo', description: 'b'.repeat(4001) }).success,
    ).toBe(false);
  });
});
