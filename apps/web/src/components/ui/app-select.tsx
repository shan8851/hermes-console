import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface/70 px-3 py-2 text-left text-sm text-fg outline-none transition-colors hover:border-accent/40 focus:border-accent/60"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={["h-3.5 w-3.5 shrink-0 text-fg-faint transition-transform", isOpen ? "rotate-180" : ""].join(" ")} />
      </button>

      {isOpen ? (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-lg shadow-black/40"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={[
                  "cursor-pointer px-3 py-2 text-sm transition-colors",
                  isSelected
                    ? "bg-accent/10 text-accent"
                    : "text-fg-muted hover:bg-white/5 hover:text-fg",
                ].join(" ")}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
