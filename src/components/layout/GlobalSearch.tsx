import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { Input } from '../ui/input';

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramTerm = searchParams.get('q') ?? '';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const clean = String(data.get('q') ?? '').trim();
    navigate(clean ? `/biblioteca?q=${encodeURIComponent(clean)}` : '/biblioteca');
  }

  return (
    <form role="search" onSubmit={onSubmit} className={className}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor="global-search" className="sr-only">
          Buscar en la biblioteca
        </label>
        <Input
          id="global-search"
          key={paramTerm}
          name="q"
          type="search"
          defaultValue={paramTerm}
          placeholder="Buscar en tu biblioteca…"
          className="h-9 border-transparent bg-secondary/60 pl-9 text-xs focus-visible:border-border focus-visible:bg-background"
        />
      </div>
    </form>
  );
}
