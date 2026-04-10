import { Search } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={[
        'flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-surface/65 px-3 py-2.5 text-fg-muted transition-colors focus-within:border-accent/45 focus-within:text-fg',
        className ?? ''
      ].join(' ')}
    >
      <Search className="h-4 w-4 shrink-0 text-fg-faint" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-fg-strong outline-none placeholder:text-fg-faint"
      />
    </label>
  );
}
