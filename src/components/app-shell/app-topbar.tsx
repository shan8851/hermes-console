export function AppTopbar() {
  return (
    <header className="border-b border-white/6 bg-[rgba(8,17,31,0.72)] px-6 py-4 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Local-first operator view
          </p>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Hermes Console
            </h1>
            <span className="hidden text-sm text-white/20 lg:inline">/</span>
            <p className="text-sm text-[var(--color-muted)]">
              Understand what your Hermes setup is doing without terminal archaeology.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-3 py-1.5 text-[var(--color-accent)]">
            root: ~/.hermes
          </span>
          <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
            all agents
          </span>
          <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
            bootstrap shell
          </span>
        </div>
      </div>
    </header>
  );
}
