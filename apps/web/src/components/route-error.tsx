export const RouteError = ({ error }: { error: Error }) => (
  <section className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-5">
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-rose-200">
      Route error
    </p>
    <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-fg-strong">
      This view could not be loaded
    </h2>
    <p className="mt-3 text-sm leading-7 text-fg-muted">
      {error.message}
    </p>
  </section>
);
