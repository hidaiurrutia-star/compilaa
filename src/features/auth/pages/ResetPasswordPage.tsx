import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Link2Off } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';
import { updatePassword } from '../services/auth.service';
import { getErrorMessage } from '../../../lib/utils';
import { useAuth } from '../AuthProvider';
import { Button, buttonVariants } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { FormError } from '../../../components/feedback/ErrorState';
import { PasswordInput } from '../components/PasswordInput';
import { PageLoader } from '../../../components/ui/spinner';
import { useToast } from '../../../components/feedback/ToastProvider';

export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    try {
      await updatePassword(values.password);
      toast({
        tone: 'success',
        title: 'Contraseña actualizada',
        description: 'Ya puedes seguir usando Compila con tu nueva contraseña.',
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo cambiar la contraseña. Solicita un enlace nuevo.'));
    }
  }

  if (loading) {
    return <PageLoader label="Validando el enlace…" />;
  }

  if (!session) {
    return (
      <div>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
          <Link2Off className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Enlace no válido</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Este enlace de recuperación no es válido, ya se ha usado o ha caducado. Solicita uno nuevo
          para continuar.
        </p>
        <div className="mt-7 space-y-3">
          <Link to="/recuperar-contrasena" className={buttonVariants({ className: 'w-full' })}>
            Solicitar otro enlace
          </Link>
          <Link
            to="/login"
            className="flex h-10 items-center justify-center text-sm text-muted-foreground hover:text-foreground"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Crea una contraseña nueva para tu cuenta. Se cerrará el enlace de recuperación al
          guardarla.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          label="Nueva contraseña"
          htmlFor="password"
          error={errors.password?.message}
          hint="Mínimo 8 caracteres, una letra y un número"
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            hasError={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>

        <Field label="Repite la contraseña" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            hasError={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </Field>

        <FormError message={formError} />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
