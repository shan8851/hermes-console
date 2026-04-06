import type { RuntimeOverviewSummary } from "@hermes-console/runtime";

export function OverviewRuntimeProfile({ overview }: { overview: RuntimeOverviewSummary }) {
  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Runtime profile</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Key configuration defaults for this installation.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {overview.runtimeProfile.map((item) => (
          <article key={item.label} className="rounded-lg border border-border/70 bg-bg/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className="mt-2 text-sm font-medium text-fg-strong">{item.value}</p>
            {item.detail ? <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
