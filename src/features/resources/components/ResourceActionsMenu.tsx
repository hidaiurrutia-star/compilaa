import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { FolderInput, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';

interface ResourceActionsMenuProps {
  title: string;
  canEdit: boolean;
  canMove: boolean;
  canDelete: boolean;
  canShare: boolean;
  onEdit: () => void;
  onMove: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ResourceActionsMenu({
  title,
  canEdit,
  canMove,
  canDelete,
  canShare,
  onEdit,
  onMove,
  onShare,
  onDelete,
}: ResourceActionsMenuProps) {
  if (!canEdit && !canMove && !canDelete && !canShare) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Acciones para ${title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit ? (
          <DropdownMenuItem
            onSelect={() => {
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Editar
          </DropdownMenuItem>
        ) : null}
        {canMove ? (
          <DropdownMenuItem
            onSelect={() => {
              onMove();
            }}
          >
            <FolderInput className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Mover u organizar
          </DropdownMenuItem>
        ) : null}
        {canShare ? (
          <DropdownMenuItem
            onSelect={() => {
              onShare();
            }}
          >
            <Share2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Compartir
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onDelete();
              }}
              className="text-red-300 focus:bg-destructive/10 focus:text-red-200"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
