import { useEffect, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import type { Folder, Scope, Subject } from '../../../types/models';
import { createFolder, renameFolder } from '../../../services/folders';
import { getErrorMessage } from '../../../lib/utils';
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

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  userId: string;
  folders: Folder[];
  subjects: Subject[];
  folder?: Folder | null;
  defaultParentId?: string | null;
  onSaved: () => void;
}

export function FolderDialog({
  open,
  onOpenChange,
  scope,
  userId,
  folders,
  subjects,
  folder,
  defaultParentId,
  onSaved,
}: FolderDialogProps) {
  const { toast } = useToast();
  const editing = Boolean(folder);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(folder?.name ?? '');
    setParentId(folder?.parent_folder_id ?? defaultParentId ?? '');
    setSubjectId(folder?.subject_id ?? '');
    setError(null);
  }, [open, folder, defaultParentId]);

  async function handleSubmit() {
    setError(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Escribe un nombre para la carpeta.');
      return;
    }
    if (cleanName.length > 120) {
      setError('El nombre no puede superar los 120 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (folder) {
        await renameFolder(folder.id, cleanName);
        toast({ tone: 'success', title: 'Carpeta renombrada' });
      } else {
        await createFolder({
          name: cleanName,
          ownerId: userId,
          spaceId: scope.type === 'space' ? scope.id : null,
          parentFolderId: parentId || null,
          subjectId: subjectId || null,
        });
        toast({ tone: 'success', title: 'Carpeta creada' });
      }
      onOpenChange(false);
      onSaved();
    } catch (folderError) {
      setError(getErrorMessage(folderError, 'No se pudo guardar la carpeta.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
            <FolderPlus className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>{editing ? 'Renombrar carpeta' : 'Nueva carpeta'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Cambia el nombre de la carpeta. Su contenido y ubicación se mantienen.'
              : 'Organiza tus materiales en carpetas. Puedes anidarlas dentro de otras.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Nombre" htmlFor="folder-name">
            <Input
              id="folder-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Unidad 2"
              maxLength={120}
              autoFocus
            />
          </Field>

          {!editing ? (
            <>
              <Field label="Carpeta padre" htmlFor="folder-parent" optional>
                <Select
                  id="folder-parent"
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                >
                  <option value="">Raíz</option>
                  {folders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Asignatura" htmlFor="folder-subject" optional>
                <Select
                  id="folder-subject"
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
            </>
          ) : null}

          <FormError message={error} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editing ? 'Guardar nombre' : 'Crear carpeta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
