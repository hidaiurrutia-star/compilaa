import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDate,
  formatRelativeDate,
  getErrorMessage,
  getFirstName,
  getInitials,
  safeRedirectPath,
} from './utils';

describe('formatBytes', () => {
  it('devuelve un guion cuando no hay tamaño', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(-10)).toBe('—');
  });

  it('formatea bytes, kilobytes y megabytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10 * 1024)).toBe('10 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('fechas', () => {
  it('formatea fechas válidas y devuelve un guion para valores inválidos', () => {
    expect(formatDate('2026-01-15T10:00:00.000Z')).not.toBe('—');
    expect(formatDate('no-es-una-fecha')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });

  it('describe fechas recientes de forma relativa', () => {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();

    expect(formatRelativeDate(oneMinuteAgo)).toBe('hace 1 min');
    expect(formatRelativeDate(twoHoursAgo)).toBe('hace 2 h');
    expect(formatRelativeDate('no-es-una-fecha')).toBe('—');
  });
});

describe('getInitials', () => {
  it('usa las iniciales de las dos primeras palabras', () => {
    expect(getInitials('Ana María Pérez')).toBe('AM');
    expect(getInitials('  lucas  ')).toBe('L');
  });

  it('devuelve un signo de interrogación para nombres vacíos', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getFirstName', () => {
  it('devuelve la primera palabra sin espacios extra', () => {
    expect(getFirstName('  Ana María Pérez ')).toBe('Ana');
    expect(getFirstName('Lucas')).toBe('Lucas');
  });
});

describe('safeRedirectPath', () => {
  it('acepta rutas internas', () => {
    expect(safeRedirectPath('/biblioteca?q=calculo')).toBe('/biblioteca?q=calculo');
    expect(safeRedirectPath('/invitaciones/abc')).toBe('/invitaciones/abc');
  });

  it('rechaza destinos externos y rutas con barras invertidas', () => {
    expect(safeRedirectPath('https://malicioso.example')).toBe('/dashboard');
    expect(safeRedirectPath('//malicioso.example')).toBe('/dashboard');
    expect(safeRedirectPath('/ruta\\maliciosa')).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath(42)).toBe('/dashboard');
  });

  it('admite un destino alternativo', () => {
    expect(safeRedirectPath('https://malicioso.example', '/login')).toBe('/login');
  });
});

describe('getErrorMessage', () => {
  it('traduce errores de credenciales de Supabase', () => {
    expect(getErrorMessage(new Error('Invalid login credentials'), 'fallback')).toBe(
      'El correo o la contraseña no son correctos.',
    );
  });

  it('traduce códigos de PostgreSQL', () => {
    expect(getErrorMessage({ message: 'duplicate key', code: '23505' }, 'fallback')).toBe(
      'Ya existe un registro con esos datos.',
    );
    expect(getErrorMessage({ message: 'permission denied', code: '42501' }, 'fallback')).toBe(
      'No tienes permisos para realizar esta acción.',
    );
  });

  it('conserva los mensajes seguros de las funciones SQL', () => {
    expect(
      getErrorMessage({ message: 'Esta invitación pertenece a otro correo electrónico.', code: 'P0001' }, 'fallback'),
    ).toBe('Esta invitación pertenece a otro correo electrónico.');
  });

  it('usa el mensaje alternativo cuando no hay información', () => {
    expect(getErrorMessage(null, 'Algo salió mal.')).toBe('Algo salió mal.');
    expect(getErrorMessage(new Error('   '), 'Algo salió mal.')).toBe('Algo salió mal.');
  });
});
