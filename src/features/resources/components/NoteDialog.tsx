import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText } from 'lucide-react';
import { noteSchema, type NoteValues } from '../schemas';
import type { Folder, ResourceWithRelations, Scope, Subject } from '../../../types/models';
import { createNote, updateResource } from '../../../services/resources';
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
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { FormError } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/ToastProvider';

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  userId: string;
  subjects: Subject[];
  folders: Folder[];
  resource?: ResourceWithRelations | null;
  defaultFolderId?: string | null;
  /** Para recursos compartidos por otra persona: solo se edita el contenido. */
  lockOrganization?: boolean;
  onSaved: () => void;
}

export function NoteDialog({
  open,
  onOpenChange,
  scope,
  userId,
  subjects,
  folders,
  resource,
  defaultFolderId,
  lockOrganization = false,
  onSaved,
}: NoteDialogProps) {
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(resource);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', description: '', content: '', subjectId: '', folderId: '' },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      title: resource?.title ?? '',
      description: resource?.description ?? '',
      content: resource?.content ?? '',
      subjectId: resource?.subject_id ?? '',
      folderId: resource?.folder_id ?? defaultFolderId ?? '',
    });
  }, [open, resource, defaultFolderId, reset]);

  async function onSubmit(values: NoteValues) {
    setFormError(null);
    try {
      if (resource) {
        await updateResource(resource.id, {
          title: values.title,
          description: values.description || null,
          content: values.content,
          ...(lockOrganization
            ? {}
            : {
                subject_id: values.subjectId || null,
                folder_id: values.folderId || null,
              }),
        });
        toast({ tone: 'success', title: 'Nota actualizada' });
      } else {
        await createNote({
          title: values.title,
          description: values.description,
          content: values.content,
          ownerId: userId,
          spaceId: scope.type === 'space' ? scope.id : null,
          folderId: values.folderId || null,
          subjectId: values.subjectId || null,
        });
        toast({ tone: 'success', title: 'Nota creada' });
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo guardar la nota.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>{editing ? 'Editar nota' : 'Nueva nota'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Actualiza el contenido de la nota. Los cambios se guardan al confirmar.'
              : 'Escribe una nota de estudio. Solo será visible según el espacio en el que la crees.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Título" htmlFor="note-title" error={errors.title?.message}>
            <Input
              id="note-title"
              placeholder="Ej. Resumen del tema 3"
              hasError={Boolean(errors.title)}
              {...register('title')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Asignatura" htmlFor="note-subject" optional>
              <Select id="note-subject" disabled={lockOrganization} {...register('subjectId')}>
                <option value="">Sin asignatura</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Carpeta" htmlFor="note-folder" optional>
              <Select id="note-folder" disabled={lockOrganization} {...register('folderId')}>
                <option value="">Sin carpeta</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Descripción breve" htmlFor="note-description" error={errors.description?.message} optional>
            <Input
              id="note-description"
              placeholder="Una frase para encontrar la nota después"
              hasError={Boolean(errors.description)}
              {...register('description')}
            />
          </Field>

          <Field
            label="Contenido"
            htmlFor="note-content"
            error={errors.content?.message}
            hint="Se guarda como texto plano"
          >
            <Textarea
              id="note-content"
              className="min-h-[240px] font-mono text-[13px] leading-6"
              placeholder="Escribe aquí tus apuntes…"
              hasError={Boolean(errors.content)}
              {...register('content')}
            />
          </Field>

          <FormError message={formError} />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? 'Guardar cambios' : 'Crear nota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
