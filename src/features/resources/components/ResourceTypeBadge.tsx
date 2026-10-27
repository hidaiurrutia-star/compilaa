import { FileText, Folder } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

export function ResourceTypeBadge({ type }: { type: 'note' | 'document' }) {
  return (
    <Badge variant={type === 'note' ? 'accent' : 'default'}>
      {type === 'note' ? (
        <FileText className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Folder className="h-3 w-3" aria-hidden="true" />
      )}
      {type === 'note' ? 'Nota' : 'Documento'}
    </Badge>
  );
}
