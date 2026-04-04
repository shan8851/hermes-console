type AppSelectOption = {
  value: string;
  label: string;
};

export function AppSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  ariaLabel: string;
}) {
  return (
    <div className="relative min-w-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 w-full appearance-none rounded-md border border-border bg-surface/70 px-3 py-2 pr-9 text-sm text-fg outline-none transition-colors hover:border-accent/40 focus:border-accent/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-accent"
      >
        ▾
      </span>
    </div>
  );
}
