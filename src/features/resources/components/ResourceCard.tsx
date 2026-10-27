import { Link } from 'react-router-dom';
import { FileText, Paperclip } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatBytes, formatRelativeDate } from '../../../lib/utils';
import type { ResourceWithRelations } from '../../../types/models';
import { ResourceTypeBadge } from './ResourceTypeBadge';

interface ResourceCardProps {
  resource: ResourceWithRelations;
  userId: string;
  actions?: ReactNode;
}

export function ResourceCard({ resource, userId, actions }: ResourceCardProps) {
  const isSharedWithMe = resource.space_id === null && resource.owner_id !== userId;
  const contextLabel = resource.space
    ? resource.space.name
    : isSharedWithMe
      ? 'Compartido contigo'
      : 'Personal';

  return (
    <Card className="group flex h-full flex-col p-5 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/70">
          {resource.resource_type === 'note' ? (
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <Badge variant={resource.space ? 'warning' : isSharedWithMe ? 'success' : 'outline'}>
            {contextLabel}
          </Badge>
          {actions}
        </div>
      </div>

      <Link to={`/biblioteca/${resource.id}`} className="mt-4 block rounded-sm">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary">
          {resource.title}
        </h3>
      </Link>
      {resource.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {resource.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ResourceTypeBadge type={resource.resource_type} />
        {resource.subject ? <Badge variant="outline">{resource.subject.name}</Badge> : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3.5 text-[11px] text-muted-foreground">
        <span className="truncate">
          {resource.owner && resource.owner_id !== userId
            ? `Por ${resource.owner.display_name}`
            : formatRelativeDate(resource.updated_at)}
        </span>
        <span className="shrink-0">
          {resource.resource_type === 'document'
            ? formatBytes(resource.file_size)
            : formatRelativeDate(resource.created_at)}
        </span>
      </div>
    </Card>
  );
}
