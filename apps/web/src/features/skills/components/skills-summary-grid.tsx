type SkillsSummaryItem = {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "muted";
};

export function SkillsSummaryGrid({ items }: { items: SkillsSummaryItem[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            {item.label}
          </p>
          <p
            className={[
              "mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight",
              item.tone === "muted" ? "text-fg" : "text-fg-strong",
            ].join(" ")}
          >
            {item.value}
          </p>
          {item.detail ? <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p> : null}
        </article>
      ))}
    </section>
  );
}
