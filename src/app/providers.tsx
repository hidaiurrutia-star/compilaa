import type { ReactNode } from 'react';
import { supabaseConfig } from '../lib/supabase/config';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ToastProvider } from '../components/feedback/ToastProvider';
import { ThemeProvider } from './theme';
import { ConfigMissingPage } from './ConfigMissingPage';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {supabaseConfig.isConfigured ? (
          <AuthProvider>{children}</AuthProvider>
        ) : (
          <ConfigMissingPage />
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}
