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
    <div className="space-y-8">
      <section className="max-w-2xl">
        <p className="font-[family-name:var(--font-jetbrains)] text-[11px] uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          {description}
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {bullets.map((bullet) => (
          <article
            key={bullet}
            className="rounded-lg border border-border bg-surface/70 p-3"
          >
            <p className="text-sm leading-6 text-fg">{bullet}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
