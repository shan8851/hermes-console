type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  bullets,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8 shadow-2xl shadow-black/15 backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-accent)]">
          {eyebrow}
        </p>
        <div className="mt-4 max-w-3xl space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="text-sm leading-7 text-[var(--color-muted)] sm:text-base">
            {description}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {bullets.map((bullet) => (
          <article
            key={bullet}
            className="rounded-2xl border border-white/8 bg-black/10 p-5"
          >
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              <p className="text-sm leading-6 text-slate-200">{bullet}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
