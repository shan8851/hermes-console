import { Link } from '@tanstack/react-router';

type BreadcrumbItem = {
  label: string;
  params?: Record<string, string>;
  search?: Record<string, string | undefined>;
  to?: string;
};

export function AppBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}:${item.to ?? 'current'}`} className="flex items-center gap-2">
            {item.to && !isLast ? (
              <Link
                params={item.params as never}
                search={item.search as never}
                to={item.to as never}
                className="rounded-full border border-border/80 bg-bg/40 px-3 py-1.5 font-mono transition-colors hover:border-accent/60 hover:text-fg"
              >
                {item.label}
              </Link>
            ) : (
              <span className="rounded-full border border-border/80 bg-bg/40 px-3 py-1.5 font-mono text-fg">
                {item.label}
              </span>
            )}
            {!isLast ? <span className="font-mono text-fg-faint">/</span> : null}
          </div>
        );
      })}
    </nav>
  );
}
