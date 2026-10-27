import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UsersRound } from 'lucide-react';
import { spaceSchema, type SpaceValues } from '../schemas';
import type { Space } from '../../../types/models';
import { createSpace, updateSpace } from '../../../services/spaces';
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
import { FormError } from '../../../components/feedback/ErrorState';
import { useToast } from '../../../components/feedback/ToastProvider';

interface SpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  space?: Space | null;
  onSaved: (space: Space) => void;
}

export function SpaceDialog({ open, onOpenChange, userId, space, onSaved }: SpaceDialogProps) {
  const { toast } = useToast();
  const editing = Boolean(space);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpaceValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: { name: '', description: '', subjects: '' },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      name: space?.name ?? '',
      description: space?.description ?? '',
      subjects: '',
    });
  }, [open, space, reset]);

  async function onSubmit(values: SpaceValues) {
    setFormError(null);
    try {
      const subjectNames = (values.subjects ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

      const saved = space
        ? await updateSpace(space.id, {
            name: values.name,
            description: values.description,
          })
        : await createSpace({
            name: values.name,
            description: values.description,
            ownerId: userId,
            subjectNames,
          });

      toast({
        tone: 'success',
        title: editing ? 'Espacio actualizado' : 'Espacio creado',
        description: editing
          ? 'Los cambios ya son visibles para sus miembros.'
          : 'Ya puedes invitar a tus compañeros y añadir materiales.',
      });
      onOpenChange(false);
      onSaved(saved);
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo guardar el espacio.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!isSubmitting ? onOpenChange(next) : undefined)}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle>{editing ? 'Editar espacio' : 'Crear espacio compartido'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Cambia el nombre o la descripción. Solo el propietario puede editar el espacio.'
              : 'Un espacio compartido es privado por defecto: solo sus miembros podrán ver lo que contiene.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Nombre del espacio" htmlFor="space-name" error={errors.name?.message}>
            <Input
              id="space-name"
              placeholder="Ej. Grupo de Cálculo II"
              hasError={Boolean(errors.name)}
              maxLength={120}
              autoFocus
              {...register('name')}
            />
          </Field>

          <Field
            label="Descripción"
            htmlFor="space-description"
            error={errors.description?.message}
            optional
          >
            <Textarea
              id="space-description"
              placeholder="Para qué os sirve este espacio, normas del grupo…"
              hasError={Boolean(errors.description)}
              maxLength={2000}
              className="min-h-[90px]"
              {...register('description')}
            />
          </Field>

          {!editing ? (
            <Field
              label="Asignaturas iniciales"
              htmlFor="space-subjects"
              error={errors.subjects?.message}
              hint="Opcional"
              optional
            >
              <Input
                id="space-subjects"
                placeholder="Cálculo II, Álgebra, Física"
                maxLength={300}
                {...register('subjects')}
              />
              <p className="text-[11px] leading-5 text-muted-foreground">
                Separa los nombres con comas. Podrás añadir más después.
              </p>
            </Field>
          ) : null}

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
              {editing ? 'Guardar cambios' : 'Crear espacio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
