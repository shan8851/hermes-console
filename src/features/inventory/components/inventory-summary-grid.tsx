type InventorySummaryGridProps = {
  items: Array<{
    label: string;
    value: string;
    tone?: "default" | "muted";
  }>;
};

export function InventorySummaryGrid({ items }: InventorySummaryGridProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            {item.label}
          </p>
          <p
            className={[
              "mt-2 text-sm leading-6",
              item.tone === "muted" ? "text-fg-muted" : "text-fg-strong",
            ].join(" ")}
          >
            {item.value}
          </p>
        </article>
      ))}
    </section>
  );
}
