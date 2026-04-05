import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

function toneClasses(tone: "critical" | "warning" | "info") {
  switch (tone) {
    case "critical":
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-sky-500/30 bg-sky-500/10 text-sky-100";
  }
}

export function OverviewAttention({ overview }: { overview: RuntimeOverviewSummary }) {
  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Attention now</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">High-signal warnings only. If this section is quiet, the install is in much better shape.</p>
      </div>

      {overview.warnings.length === 0 ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          No active warnings detected in the latest runtime snapshot.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {overview.warnings.map((warning) => (
            <article key={warning.id} className={["rounded-lg border p-4", toneClasses(warning.tone)].join(" ")}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">{warning.tone.replace("_", " ")}</p>
              <p className="mt-2 text-sm font-medium text-current">{warning.title}</p>
              <p className="mt-2 text-sm leading-6 opacity-85">{warning.detail}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
