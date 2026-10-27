import { useEffect, useState } from 'react';
import { FolderInput } from 'lucide-react';
import type { Folder, ResourceWithRelations, Subject } from '../../../types/models';
import { updateResource } from '../../../services/resources';
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
import { Select } from '../../../components/ui/select';
import { FormError } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/ToastProvider';

interface MoveResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ResourceWithRelations | null;
  folders: Folder[];
  subjects: Subject[];
  onMoved: () => void;
}

export function MoveResourceDialog({
  open,
  onOpenChange,
  resource,
  folders,
  subjects,
  onMoved,
}: MoveResourceDialogProps) {
  const { toast } = useToast();
  const [folderId, setFolderId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !resource) return;
    setFolderId(resource.folder_id ?? '');
    setSubjectId(resource.subject_id ?? '');
    setError(null);
  }, [open, resource]);

  async function handleSubmit() {
    if (!resource) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateResource(resource.id, {
        folder_id: folderId || null,
        subject_id: subjectId || null,
      });
      toast({ tone: 'success', title: 'Recurso reorganizado' });
      onOpenChange(false);
      onMoved();
    } catch (moveError) {
      setError(getErrorMessage(moveError, 'No se pudo mover el recurso.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
            <FolderInput className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>Mover u organizar</DialogTitle>
          <DialogDescription>
            Cambia la carpeta o la asignatura de «{resource?.title ?? 'este recurso'}». No se moverá a
            otro espacio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Carpeta" htmlFor="move-folder">
            <Select id="move-folder" value={folderId} onChange={(event) => setFolderId(event.target.value)}>
              <option value="">Sin carpeta</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Asignatura" htmlFor="move-subject">
            <Select
              id="move-subject"
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

          <FormError message={error} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Guardar ubicación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
