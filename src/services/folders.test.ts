import { describe, expect, it } from 'vitest';
import type { Folder } from '../types/models';
import { getFolderPath } from './folders';

function folder(overrides: Partial<Folder> & Pick<Folder, 'id' | 'name'>): Folder {
  return {
    owner_id: 'user-1',
    space_id: null,
    parent_folder_id: null,
    subject_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getFolderPath', () => {
  it('devuelve una ruta vacía cuando no hay carpeta seleccionada', () => {
    expect(getFolderPath([], null)).toEqual([]);
    expect(getFolderPath([], 'inexistente')).toEqual([]);
  });

  it('devuelve la jerarquía desde la raíz hasta la carpeta indicada', () => {
    const folders = [
      folder({ id: 'root', name: 'Universidad' }),
      folder({ id: 'child', name: 'Cálculo', parent_folder_id: 'root' }),
      folder({ id: 'leaf', name: 'Parciales', parent_folder_id: 'child' }),
    ];

    expect(getFolderPath(folders, 'leaf').map((item) => item.id)).toEqual(['root', 'child', 'leaf']);
    expect(getFolderPath(folders, 'child').map((item) => item.name)).toEqual(['Universidad', 'Cálculo']);
  });

  it('no entra en bucles si los datos contienen referencias circulares', () => {
    const folders = [
      folder({ id: 'a', name: 'A', parent_folder_id: 'b' }),
      folder({ id: 'b', name: 'B', parent_folder_id: 'a' }),
    ];

    const path = getFolderPath(folders, 'a');
    expect(path).toHaveLength(2);
    expect(path.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
