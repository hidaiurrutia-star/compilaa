import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, LogIn } from 'lucide-react';
import { loginSchema, type LoginValues } from '../schemas';
import { signInWithPassword, resendConfirmation } from '../services/auth.service';
import { getErrorMessage, safeRedirectPath } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Field } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { FormError } from '../../../components/feedback/ErrorState';
import { PasswordInput } from '../components/PasswordInput';
import { useToast } from '../../../components/feedback/ToastProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const confirmed = searchParams.get('confirmado') === '1';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const email = watch('email');

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (params.has('error') || params.has('error_description')) {
      setLinkError('El enlace no es válido o ha caducado. Solicita uno nuevo.');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const nextPath = safeRedirectPath(searchParams.get('next'), '');
  const registerHref = nextPath ? `/registro?next=${encodeURIComponent(nextPath)}` : '/registro';

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await signInWithPassword(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(safeRedirectPath(from ?? nextPath), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendConfirmation(email);
      toast({
        tone: 'success',
        title: 'Correo de confirmación enviado',
        description: 'Revisa tu bandeja de entrada y la carpeta de spam.',
      });
    } catch (error) {
      toast({ tone: 'error', title: 'No se pudo reenviar', description: getErrorMessage(error, 'Inténtalo más tarde.') });
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Acceso</p>
        <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión en Compila</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Entra para consultar tus materias y los materiales de tu grupo.
        </p>
      </div>

      {confirmed ? (
        <p className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Correo confirmado. Ya puedes iniciar sesión.
        </p>
      ) : null}

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

        <Field
          label="Contraseña"
          htmlFor="password"
          error={errors.password?.message}
          hint={
            <Link to="/recuperar-contrasena" className="text-primary underline-offset-4 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            hasError={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>

        <FormError message={formError} />
        {linkError ? <FormError message={linkError} /> : null}

        {formError?.toLowerCase().includes('confirmar') && email ? (
          <Button type="button" variant="outline" size="sm" onClick={handleResend} loading={resending}>
            Reenviar correo de confirmación
          </Button>
        ) : null}

        <Button type="submit" className="w-full" loading={isSubmitting}>
          {!isSubmitting ? <LogIn aria-hidden="true" /> : null}
          Entrar
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        ¿Todavía no tienes cuenta?{' '}
        <Link to={registerHref} className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
          Crear una cuenta
        </Link>
      </p>
    </div>
  );
}
