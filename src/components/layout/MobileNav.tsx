import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { SidebarContent } from './Sidebar';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay data-[state=open]:animate-fade-in lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-border bg-sidebar shadow-lift data-[state=open]:animate-fade-in lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Navegación de Compila</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>
          <SidebarContent onNavigate={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
