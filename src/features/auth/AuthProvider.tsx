import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase/client';
import { ensureProfile, updateDisplayName as updateProfileName } from '../../services/profile';
import type { Profile } from '../../types/models';
import { signOut as signOutRequest } from './services/auth.service';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function fallbackDisplayName(user: User): string {
  const metadataName = user.user_metadata?.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return user.email?.split('@')[0] ?? 'Estudiante';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (user: User) => {
    setProfileError(null);
    try {
      const data = await ensureProfile(user.id, fallbackDisplayName(user));
      if (mounted.current) setProfile(data);
    } catch (error) {
      if (mounted.current) {
        setProfile(null);
        setProfileError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar tu perfil. Revisa que las migraciones estén aplicadas.',
        );
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const supabase = getSupabase();

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted.current) return;
      if (error) {
        setProfileError(error.message);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user);
      }
      if (mounted.current) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted.current) return;
      setSession(nextSession);

      if (event === 'SIGNED_OUT' || !nextSession) {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        void loadProfile(nextSession.user);
      }

      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession);
      }
    });

    return () => {
      mounted.current = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await loadProfile(session.user);
  }, [loadProfile, session]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!session?.user) throw new Error('No hay una sesión activa.');
      const updated = await updateProfileName(session.user.id, name);
      setProfile(updated);
      await getSupabase().auth.updateUser({ data: { display_name: updated.display_name } });
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await signOutRequest();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileError,
      refreshProfile,
      updateDisplayName,
      signOut,
    }),
    [session, profile, loading, profileError, refreshProfile, updateDisplayName, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}

/** Solo para componentes montados dentro de ProtectedRoute. */
export function useAuthenticatedUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('Se requiere una sesión activa.');
  return user;
}
