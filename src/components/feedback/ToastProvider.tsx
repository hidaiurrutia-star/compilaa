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
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: { tone?: ToastTone; title: string; description?: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100',
  error: 'border-destructive/40 bg-red-950/85 text-red-100',
  info: 'border-border bg-popover text-foreground',
};

const TONE_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ tone = 'info', title, description }: { tone?: ToastTone; title: string; description?: string }) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-3), { id, tone, title, description }]);
      const timer = window.setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => {
          const Icon = TONE_ICONS[item.tone];
          return (
            <div
              key={item.id}
              role={item.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-lift animate-scale-in',
                TONE_STYLES[item.tone],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 break-words text-xs opacity-80">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider.');
  return context;
}
