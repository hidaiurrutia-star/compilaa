import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getInitials } from '../../lib/utils';
import { useToast } from '../feedback/ToastProvider';

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Estudiante';

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast({ tone: 'error', title: 'No se pudo cerrar la sesión', description: 'Inténtalo de nuevo.' });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 pl-1 pr-1 transition-colors hover:border-white/20 sm:pr-2.5"
          aria-label="Menú de la cuenta"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
            {getInitials(displayName)}
          </span>
          <span className="hidden max-w-[130px] truncate text-xs font-medium text-foreground sm:block">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/configuracion">
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/configuracion">
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Configuración
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void handleSignOut();
          }}
          className="text-red-300 focus:bg-destructive/10 focus:text-red-200"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
