export const RoutePending = () => (
  <section className="rounded-lg border border-border/80 bg-surface/70 p-5">
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
      Loading
    </p>
    <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold text-fg-strong">
      Loading Hermes Console
    </h2>
    <p className="mt-3 text-sm leading-7 text-fg-muted">
      Reading the latest Hermes state from the local API.
    </p>
  </section>
);
