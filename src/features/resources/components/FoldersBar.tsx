import { Folder, FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import type { Folder as FolderModel } from '../../../types/models';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { getFolderPath } from '../../../services/folders';

interface FoldersBarProps {
  folders: FolderModel[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  canManage: boolean;
  onCreate: () => void;
  onRename: (folder: FolderModel) => void;
  onDelete: (folder: FolderModel) => void;
  className?: string;
}

export function FoldersBar({
  folders,
  selectedFolderId,
  onSelect,
  canManage,
  onCreate,
  onRename,
  onDelete,
  className,
}: FoldersBarProps) {
  const selected = folders.find((folder) => folder.id === selectedFolderId) ?? null;

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {selected
              ? getFolderPath(folders, selected.id)
                  .map((folder) => folder.name)
                  .join(' / ')
              : 'Todas las carpetas'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {selected && canManage ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRename(selected)}
                aria-label={`Renombrar carpeta ${selected.name}`}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-300"
                onClick={() => onDelete(selected)}
                aria-label={`Eliminar carpeta ${selected.name}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </>
          ) : null}
          {canManage ? (
            <Button variant="outline" size="sm" onClick={onCreate}>
              <FolderPlus aria-hidden="true" />
              Nueva carpeta
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
        role="group"
        aria-label="Filtrar por carpeta"
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selectedFolderId === null}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
            selectedFolderId === null
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Todas
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => onSelect(folder.id)}
            aria-pressed={selectedFolderId === folder.id}
            title={getFolderPath(folders, folder.id)
              .map((item) => item.name)
              .join(' / ')}
            className={cn(
              'inline-flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
              selectedFolderId === folder.id
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
