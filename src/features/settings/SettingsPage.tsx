import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '../auth/schemas';
import { changePassword } from '../auth/services/auth.service';
import { useTheme, type ThemePreference } from '../../app/theme';
import { getErrorMessage } from '../../lib/utils';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { FormError } from '../../components/feedback/ErrorState';
import { PasswordInput } from '../auth/components/PasswordInput';
import { useToast } from '../../components/feedback/ToastProvider';

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Moon;
}> = [
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'El aspecto predeterminado de Compila.',
    icon: Moon,
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Fondo claro para ambientes luminosos.',
    icon: Sun,
  },
  {
    value: 'system',
    label: 'Sistema',
    description: 'Sigue la preferencia de tu dispositivo.',
    icon: Monitor,
  },
];

export function SettingsPage() {
  const { user, profile, profileError, updateDisplayName, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [passwordFormError, setPasswordFormError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '' },
  });
  const { reset: resetProfileForm } = profileForm;

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    resetProfileForm({ displayName: profile?.display_name ?? '' });
  }, [profile?.display_name, resetProfileForm]);

  async function onSubmitProfile(values: ProfileValues) {
    setProfileFormError(null);
    try {
      await updateDisplayName(values.displayName);
      toast({ tone: 'success', title: 'Perfil actualizado' });
    } catch (error) {
      setProfileFormError(getErrorMessage(error, 'No se pudo actualizar tu perfil.'));
    }
  }

  async function onSubmitPassword(values: ChangePasswordValues) {
    setPasswordFormError(null);
    try {
      await changePassword(values.currentPassword, values.password);
      passwordForm.reset();
      toast({
        tone: 'success',
        title: 'Contraseña actualizada',
        description: 'Usa la nueva contraseña la próxima vez que inicies sesión.',
      });
    } catch (error) {
      setPasswordFormError(getErrorMessage(error, 'No se pudo cambiar la contraseña.'));
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast({
        tone: 'error',
        title: 'No se pudo cerrar la sesión',
        description: 'Inténtalo de nuevo.',
      });
      setSigningOut(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Configuración"
        description="Gestiona cómo te ven tus compañeros, la seguridad de tu cuenta y el aspecto de la aplicación."
      />

      {profileError ? (
        <div className="mb-5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-sm leading-6 text-amber-200">
          No se pudo cargar tu perfil completo: {profileError}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
              <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Perfil</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Este nombre aparece junto a los materiales que creas o compartes.
              </p>
            </div>
          </div>

          <form
            onSubmit={profileForm.handleSubmit(onSubmitProfile)}
            className="space-y-4"
            noValidate
          >
            <Field
              label="Nombre visible"
              htmlFor="settings-display-name"
              error={profileForm.formState.errors.displayName?.message}
            >
              <Input
                id="settings-display-name"
                autoComplete="name"
                placeholder="Cómo te verán tus compañeros"
                hasError={Boolean(profileForm.formState.errors.displayName)}
                {...profileForm.register('displayName')}
              />
            </Field>

            <Field
              label="Correo electrónico"
              htmlFor="settings-email"
              hint="El correo no se puede cambiar aquí"
            >
              <Input id="settings-email" value={user?.email ?? ''} readOnly disabled />
            </Field>

            <FormError message={profileFormError} />

            <Button type="submit" loading={profileForm.formState.isSubmitting}>
              Guardar perfil
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Contraseña</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Para cambiarla, confirma primero tu contraseña actual. Así protegemos tu cuenta si
              dejas una sesión abierta.
            </p>
          </div>

          <form
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            className="space-y-4"
            noValidate
          >
            <Field
              label="Contraseña actual"
              htmlFor="settings-current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
            >
              <PasswordInput
                id="settings-current-password"
                autoComplete="current-password"
                placeholder="Tu contraseña actual"
                hasError={Boolean(passwordForm.formState.errors.currentPassword)}
                {...passwordForm.register('currentPassword')}
              />
            </Field>

            <Field
              label="Contraseña nueva"
              htmlFor="settings-new-password"
              error={passwordForm.formState.errors.password?.message}
              hint="Mínimo 8 caracteres, una letra y un número"
            >
              <PasswordInput
                id="settings-new-password"
                autoComplete="new-password"
                placeholder="Nueva contraseña"
                hasError={Boolean(passwordForm.formState.errors.password)}
                {...passwordForm.register('password')}
              />
            </Field>

            <Field
              label="Repite la contraseña nueva"
              htmlFor="settings-confirm-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
            >
              <PasswordInput
                id="settings-confirm-password"
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                hasError={Boolean(passwordForm.formState.errors.confirmPassword)}
                {...passwordForm.register('confirmPassword')}
              />
            </Field>

            <FormError message={passwordFormError} />

            <Button type="submit" loading={passwordForm.formState.isSubmitting}>
              Cambiar contraseña
            </Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
              <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Aspecto</h2>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                El tema se guarda únicamente en este navegador.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema de la aplicación">
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreference(option.value)}
                  className={
                    selected
                      ? 'rounded-lg border border-primary/50 bg-primary/10 p-3 text-left'
                      : 'rounded-lg border border-border bg-background/40 p-3 text-left transition-colors hover:border-white/20 hover:bg-accent'
                  }
                >
                  <option.icon
                    className={selected ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'}
                    aria-hidden="true"
                  />
                  <span className="mt-2 block text-xs font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Sesión</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Has iniciado sesión como{' '}
            <span className="font-medium text-foreground">{user?.email ?? 'tu cuenta'}</span>.
            Cerrar sesión no elimina ninguno de tus materiales.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void handleSignOut()}
            loading={signingOut}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </Button>
        </Card>
      </div>
    </div>
  );
}
