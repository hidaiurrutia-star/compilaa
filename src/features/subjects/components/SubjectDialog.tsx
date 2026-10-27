import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen } from 'lucide-react';
import { subjectSchema, type SubjectValues } from '../schemas';
import type { SpaceSummary, Subject } from '../../../types/models';
import { createSubject, updateSubject } from '../../../services/subjects';
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

interface SubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  subject?: Subject | null;
  editableSpaces: SpaceSummary[];
  onSaved: () => void;
}

export function SubjectDialog({
  open,
  onOpenChange,
  userId,
  subject,
  editableSpaces,
  onSaved,
}: SubjectDialogProps) {
  const { toast } = useToast();
  const editing = Boolean(subject);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: '', description: '', scopeId: '' },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      name: subject?.name ?? '',
      description: subject?.description ?? '',
      scopeId: subject?.space_id ?? '',
    });
  }, [open, subject, reset]);

  async function onSubmit(values: SubjectValues) {
    setFormError(null);
    try {
      if (subject) {
        await updateSubject(subject.id, {
          name: values.name,
          description: values.description,
        });
        toast({ tone: 'success', title: 'Asignatura actualizada' });
      } else {
        await createSubject({
          name: values.name,
          description: values.description,
          ownerId: userId,
          spaceId: values.scopeId || null,
        });
        toast({ tone: 'success', title: 'Asignatura creada' });
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo guardar la asignatura.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>{editing ? 'Editar asignatura' : 'Nueva asignatura'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Cambia el nombre o la descripción. La asignatura seguirá en el mismo espacio.'
              : 'Organiza tus materiales por materia. Puedes crear asignaturas personales o dentro de un espacio del que formes parte.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="subject-name" error={errors.name?.message}>
            <Input
              id="subject-name"
              placeholder="Ej. Cálculo II"
              hasError={Boolean(errors.name)}
              maxLength={120}
              autoFocus
              {...register('name')}
            />
          </Field>

          {!editing ? (
            <Field
              label="Dónde vive la asignatura"
              htmlFor="subject-scope"
              error={errors.scopeId?.message}
              hint="Define quién puede verla"
            >
              <Select id="subject-scope" {...register('scopeId')}>
                <option value="">Personal · solo para mí</option>
                {editableSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name} · compartida
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Esta asignatura pertenece a{' '}
              <span className="text-foreground">
                {subject?.space_id
                  ? editableSpaces.find((space) => space.id === subject.space_id)?.name ??
                    'un espacio compartido'
                  : 'tu espacio personal'}
              </span>
              .
            </p>
          )}

          <Field
            label="Descripción"
            htmlFor="subject-description"
            error={errors.description?.message}
            optional
          >
            <Textarea
              id="subject-description"
              placeholder="Temario, profesor, observaciones…"
              hasError={Boolean(errors.description)}
              maxLength={2000}
              className="min-h-[84px]"
              {...register('description')}
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
              {editing ? 'Guardar cambios' : 'Crear asignatura'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
