import { NavLink } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { MAIN_NAV, SECONDARY_NAV, type NavItem } from './navigation';
import { cn } from '../../lib/utils';

function NavSection({ items, label, onNavigate }: { items: NavItem[]; label: string; onNavigate?: () => void }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </p>
      <nav aria-label={label} className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-sidebar-foreground hover:bg-white/[0.04] hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <item.icon
                  className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-border/60 px-5">
        <NavLink to="/dashboard" onClick={onNavigate} aria-label="Compila, ir al inicio">
          <Logo size="md" />
        </NavLink>
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        <NavSection items={MAIN_NAV} label="Estudio" onNavigate={onNavigate} />
        <NavSection items={SECONDARY_NAV} label="Cuenta" onNavigate={onNavigate} />
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="rounded-lg border border-border/70 bg-background/40 p-3.5">
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Tu espacio es privado
          </p>
          <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
            Solo tú puedes ver tu espacio personal hasta que compartas algo de forma explícita.
          </p>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex"
      aria-label="Barra lateral"
    >
      <SidebarContent />
    </aside>
  );
}
