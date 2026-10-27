import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: TabItem[];
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ value, onValueChange, items, className, ariaLabel = 'Secciones' }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
    const next = items[nextIndex];
    if (next) onValueChange(next.value);
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-1 overflow-x-auto border-b border-border scrollbar-none', className)}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              selected
                ? 'text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
