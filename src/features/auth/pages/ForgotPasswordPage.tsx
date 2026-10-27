import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';
import { sendPasswordReset } from '../services/auth.service';
import { getErrorMessage } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { FormError } from '../../../components/feedback/ErrorState';

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    try {
      await sendPasswordReset(values.email);
      setSentTo(values.email);
    } catch (error) {
      setFormError(
        getErrorMessage(error, 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo.'),
      );
    }
  }

  if (sentTo) {
    return (
      <div>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
          <MailCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Si existe una cuenta asociada a <span className="font-medium text-foreground">{sentTo}</span>,
          recibirás un enlace para restablecer la contraseña. Por seguridad, no confirmamos si el
          correo está registrado.
        </p>
        <div className="mt-7 space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={() => setSentTo(null)}>
            Usar otro correo
          </Button>
          <Link
            to="/login"
            className="flex h-10 items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Recuperación</p>
        <h1 className="text-2xl font-semibold tracking-tight">Recupera tu acceso</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Escribe el correo de tu cuenta y te enviaremos un enlace seguro para crear una nueva
          contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            hasError={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <FormError message={formError} />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {!isSubmitting ? <Send aria-hidden="true" /> : null}
          Enviar enlace
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        <Link to="/login" className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
