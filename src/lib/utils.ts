import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const dateFormatter = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'hace un momento';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays} d`;
  return formatDate(value);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function getFirstName(name: string): string {
  const clean = name.trim();
  return clean.split(/\s+/)[0] ?? clean;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return mapError(error);
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; code?: unknown; status?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return mapError({ message: candidate.message, code: candidate.code, status: candidate.status });
    }
  }
  return fallback;
}

const POSTGRES_MESSAGES: Record<string, string> = {
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'La operación hace referencia a un elemento que ya no existe.',
  '23514': 'Los datos no cumplen las reglas de la aplicación.',
  '23502': 'Faltan datos obligatorios.',
  '42501': 'No tienes permisos para realizar esta acción.',
  '42P01': 'La base de datos aún no está configurada por completo.',
  PGRST116: 'No se encontró el recurso solicitado o no tienes acceso.',
  PGRST301: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
};

function mapError(error: { message: string; code?: unknown; status?: unknown }): string {
  const message = error.message;
  const code = typeof error.code === 'string' ? error.code : '';

  if (POSTGRES_MESSAGES[code]) return POSTGRES_MESSAGES[code];

  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'El correo o la contraseña no son correctos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.';
  }
  if (normalized.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (normalized.includes('password should be at least')) {
    return 'La contraseña no cumple la longitud mínima.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (normalized.includes('row-level security') || normalized.includes('permission denied')) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  }
  if (normalized.includes('jwt') && normalized.includes('expired')) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
  }

  // Los mensajes de nuestras funciones SQL están redactados en español y son seguros.
  if (code === 'P0001') return message;

  return message.length < 220 ? message : 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

export function safeRedirectPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

/** Copia texto al portapapeles con un fallback para navegadores sin permisos. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}
