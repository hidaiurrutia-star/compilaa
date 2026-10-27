import {
  BookOpen,
  FolderLock,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/personal', label: 'Mi espacio', icon: FolderLock },
  { to: '/espacios', label: 'Espacios compartidos', icon: Users },
  { to: '/asignaturas', label: 'Asignaturas', icon: BookOpen },
  { to: '/biblioteca', label: 'Biblioteca', icon: LibraryBig },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];
