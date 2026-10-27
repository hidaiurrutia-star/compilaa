import { getSupabase } from '../../../lib/supabase/client';
import { safeRedirectPath } from '../../../lib/utils';

function buildEmailRedirect(nextPath?: string): string {
  const url = new URL(`${window.location.origin}/login`);
  url.searchParams.set('confirmado', '1');
  const safeNext = safeRedirectPath(nextPath, '');
  if (safeNext) url.searchParams.set('next', safeNext);
  return url.toString();
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(
  displayName: string,
  email: string,
  password: string,
  nextPath?: string,
) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: buildEmailRedirect(nextPath),
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/restablecer-contrasena`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { data, error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
  return data;
}

/**
 * Cambia la contraseña verificando antes la contraseña actual.
 * Supabase no exige la contraseña anterior en updateUser, así que
 * reautenticamos para evitar cambios desde una sesión desatendida.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const email = userData.user.email;
  if (!email) throw new Error('Tu cuenta no tiene un correo asociado.');

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) {
    throw new Error('La contraseña actual no es correcta.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export async function resendConfirmation(email: string, nextPath?: string) {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: buildEmailRedirect(nextPath) },
  });
  if (error) throw error;
}
