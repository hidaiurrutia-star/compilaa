import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'compila-theme';

function getStoredPreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'dark';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return preference;
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getStoredPreference()));

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    const resolved = resolveTheme(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    function onChange() {
      if (preference === 'system') {
        const resolved = resolveTheme('system');
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    }
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider.');
  return context;
}
