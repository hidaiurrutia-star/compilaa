export const STORAGE_BUCKET = 'study-materials';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'application/zip': ['.zip'],
} as const;

export const ACCEPT_ATTRIBUTE = Object.entries(ACCEPTED_FILE_TYPES)
  .flatMap(([, extensions]) => extensions)
  .join(',');

export function isAllowedFile(file: File): boolean {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const allowedExtensions = ACCEPTED_FILE_TYPES[file.type as keyof typeof ACCEPTED_FILE_TYPES];

  // Si el navegador informa un MIME, debe estar en la lista y coincidir con la extensión.
  if (file.type && file.type !== 'application/octet-stream') {
    return Boolean(allowedExtensions && (allowedExtensions as readonly string[]).includes(extension));
  }

  // Fallback únicamente cuando el navegador no puede determinar el MIME.
  return Object.values(ACCEPTED_FILE_TYPES).some((extensions) =>
    (extensions as readonly string[]).includes(extension),
  );
}

export function sanitizeFileName(name: string): string {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
  return cleaned.slice(-120) || 'archivo';
}

export const PAGE_SIZE = 24;
