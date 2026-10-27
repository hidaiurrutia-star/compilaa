import { describe, expect, it } from 'vitest';
import { isAllowedFile, sanitizeFileName } from './constants';

function file(name: string, type: string): File {
  return new File(['contenido'], name, { type });
}

describe('isAllowedFile', () => {
  it('acepta tipos y extensiones permitidos', () => {
    expect(isAllowedFile(file('apuntes.pdf', 'application/pdf'))).toBe(true);
    expect(isAllowedFile(file('foto.png', 'image/png'))).toBe(true);
    expect(isAllowedFile(file('tema.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(true);
  });

  it('rechaza tipos no permitidos', () => {
    expect(isAllowedFile(file('programa.exe', 'application/x-msdownload'))).toBe(false);
  });

  it('rechaza extensiones que no coinciden con el MIME declarado', () => {
    expect(isAllowedFile(file('documento.exe', 'application/pdf'))).toBe(false);
  });

  it('usa la extensión cuando el navegador no informa el MIME', () => {
    expect(isAllowedFile(file('tema.docx', 'application/octet-stream'))).toBe(true);
    expect(isAllowedFile(file('tema.exe', 'application/octet-stream'))).toBe(false);
  });
});

describe('sanitizeFileName', () => {
  it('normaliza acentos, espacios y mayúsculas', () => {
    expect(sanitizeFileName('Apuntes de Física.pdf')).toBe('apuntes-de-fisica.pdf');
    expect(sanitizeFileName('Mi archivo.PDF')).toBe('mi-archivo.pdf');
  });

  it('elimina caracteres peligrosos y puntos iniciales', () => {
    expect(sanitizeFileName('../secreto.txt')).toBe('secreto.txt');
    expect(sanitizeFileName('???')).toBe('archivo');
    expect(sanitizeFileName('')).toBe('archivo');
  });

  it('limita la longitud del nombre final', () => {
    const result = sanitizeFileName(`${'a'.repeat(200)}.pdf`);
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});
