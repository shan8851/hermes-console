import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

function toneClass(tone: "healthy" | "warning" | "critical" | "default") {
  switch (tone) {
    case "healthy":
      return "text-emerald-200";
    case "warning":
      return "text-amber-200";
    case "critical":
      return "text-rose-200";
    default:
      return "text-fg-strong";
  }
}

export function OverviewRuntimeHealth({ overview }: { overview: RuntimeOverviewSummary }) {
  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Runtime health</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Core runtime status at a glance.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {overview.runtimeHealth.map((item) => (
          <article key={item.label} className="rounded-lg border border-border/70 bg-bg/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className={["mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight", toneClass(item.tone)].join(" ")}>{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
