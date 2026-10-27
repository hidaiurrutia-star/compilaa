import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, UserPlus } from 'lucide-react';
import { registerSchema, type RegisterValues } from '../schemas';
import { resendConfirmation, signUpWithPassword } from '../services/auth.service';
import { getErrorMessage, safeRedirectPath } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { FormError } from '../../../components/feedback/ErrorState';
import { PasswordInput } from '../components/PasswordInput';
import { useToast } from '../../../components/feedback/ToastProvider';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const nextPath = safeRedirectPath(searchParams.get('next'), '');
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      const result = await signUpWithPassword(
        values.displayName,
        values.email,
        values.password,
        nextPath || undefined,
      );
      if (result.session) {
        toast({ tone: 'success', title: 'Cuenta creada', description: 'Ya tienes acceso a tu espacio.' });
        navigate(nextPath || '/dashboard', { replace: true });
        return;
      }
      setPendingEmail(values.email);
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResending(true);
    try {
      await resendConfirmation(pendingEmail, nextPath || undefined);
      toast({
        tone: 'success',
        title: 'Correo reenviado',
        description: 'Revisa tu bandeja de entrada y la carpeta de spam.',
      });
    } catch (error) {
      toast({ tone: 'error', title: 'No se pudo reenviar', description: getErrorMessage(error, 'Inténtalo más tarde.') });
    } finally {
      setResending(false);
    }
  }

  if (pendingEmail) {
    return (
      <div>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
          <MailCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Hemos enviado un enlace de confirmación a{' '}
          <span className="font-medium text-foreground">{pendingEmail}</span>. Ábrelo para activar tu
          cuenta y después vuelve a iniciar sesión.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button type="button" variant="outline" onClick={handleResend} loading={resending}>
            Reenviar correo
          </Button>
          <Button type="button" onClick={() => navigate(loginHref)}>
            Ir al inicio de sesión
          </Button>
        </div>
        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          Si tu proyecto de Supabase tiene la confirmación de correo desactivada, podrás entrar
          directamente desde el inicio de sesión.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Nueva cuenta</p>
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta de Compila</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tu espacio personal empieza privado. Podrás compartir solo lo que decidas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Nombre visible" htmlFor="displayName" error={errors.displayName?.message}>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="Cómo te verán tus compañeros"
            hasError={Boolean(errors.displayName)}
            {...register('displayName')}
          />
        </Field>

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

        <Field
          label="Contraseña"
          htmlFor="password"
          error={errors.password?.message}
          hint="Mínimo 8 caracteres, una letra y un número"
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Crea una contraseña"
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
          {!isSubmitting ? <UserPlus aria-hidden="true" /> : null}
          Crear cuenta
        </Button>
      </form>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Al crear una cuenta aceptas usar Compila únicamente con las personas autorizadas de tu
        grupo de estudio. No compartas materiales sin permiso.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to={loginHref} className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
