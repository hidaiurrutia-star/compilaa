import { useEffect, useRef, useState } from 'react';
import { Paperclip, UploadCloud } from 'lucide-react';
import type { Folder, Scope, Subject } from '../../../types/models';
import { uploadDocument } from '../../../services/resources';
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_FILE_TYPES,
  MAX_UPLOAD_BYTES,
  isAllowedFile,
} from '../../../lib/constants';
import { formatBytes, getErrorMessage } from '../../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { FormError } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/ToastProvider';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  userId: string;
  subjects: Subject[];
  folders: Folder[];
  defaultFolderId?: string | null;
  onUploaded: () => void;
}

export function UploadDialog({
  open,
  onOpenChange,
  scope,
  userId,
  subjects,
  folders,
  defaultFolderId,
  onUploaded,
}: UploadDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle('');
    setDescription('');
    setSubjectId('');
    setFolderId(defaultFolderId ?? '');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [open, defaultFolderId]);

  function handleFileChange(nextFile: File | null) {
    setError(null);
    setFile(nextFile);
    if (!nextFile) return;

    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setError(`El archivo supera el límite de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
      setFile(null);
      return;
    }
    if (!isAllowedFile(nextFile)) {
      setError('Tipo de archivo no permitido. Revisa los formatos aceptados.');
      setFile(null);
      return;
    }

    if (!title) {
      setTitle(nextFile.name.replace(/\.[^.]+$/, '').slice(0, 200));
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!file) {
      setError('Selecciona un archivo.');
      return;
    }
    if (!title.trim()) {
      setError('Escribe un título para el material.');
      return;
    }

    setSubmitting(true);
    try {
      await uploadDocument({
        file,
        title,
        description,
        ownerId: userId,
        spaceId: scope.type === 'space' ? scope.id : null,
        folderId: folderId || null,
        subjectId: subjectId || null,
      });
      toast({ tone: 'success', title: 'Material subido', description: 'El archivo ya está disponible.' });
      onOpenChange(false);
      onUploaded();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'No se pudo subir el archivo.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange(next) : undefined)}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
            <UploadCloud className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>Subir material</DialogTitle>
          <DialogDescription>
            El archivo se guarda en un bucket privado. Solo las personas con acceso al recurso podrán
            descargarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <input
              ref={inputRef}
              id="material-file"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="material-file"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-5 py-8 text-center transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="mt-2 text-sm font-medium text-foreground">
                {file ? file.name : 'Selecciona un archivo'}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {file
                  ? formatBytes(file.size)
                  : `Máximo ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB · PDF, Office, texto, imágenes o ZIP`}
              </span>
            </label>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              Formatos: {Object.values(ACCEPTED_FILE_TYPES).flat().join(', ')}
            </p>
          </div>

          <Field label="Título" htmlFor="material-title">
            <Input
              id="material-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Diapositivas del tema 4"
              maxLength={200}
            />
          </Field>

          <Field label="Descripción" htmlFor="material-description" optional>
            <Input
              id="material-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalle opcional"
              maxLength={4000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Asignatura" htmlFor="material-subject" optional>
              <Select
                id="material-subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">Sin asignatura</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Carpeta" htmlFor="material-folder" optional>
              <Select
                id="material-folder"
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
              >
                <option value="">Sin carpeta</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <FormError message={error} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Subir material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
