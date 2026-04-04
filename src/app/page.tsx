const bootstrapChecks = [
  "Next.js App Router scaffolded",
  "TypeScript, Tailwind, and ESLint wired in",
  "Vitest installed for the first test slice",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
        <div className="mb-10 flex flex-col gap-4">
          <span className="w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Milestone 0A
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Hermes Console
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
              Local-first web UI for understanding what your Hermes setup is doing
              without spelunking raw files or terminal output.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-[var(--color-border)] bg-black/10 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Bootstrap status
            </p>
            <ul className="mt-4 space-y-3">
              {bootstrapChecks.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-6 text-slate-200"
                >
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-black/10 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Next up
            </p>
            <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
              Build the app shell: top bar, left nav, route placeholders, and the
              first product-shaped overview surface.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
