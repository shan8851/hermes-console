import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

export function OverviewActivity({ overview }: { overview: RuntimeOverviewSummary }) {
  const items = [
    { label: "sessions", value: String(overview.activity.sessionCount), detail: "Total indexed sessions across agents." },
    { label: "cron attention", value: String(overview.activity.cronAttentionJobs), detail: "Jobs that are overdue, flaky, or currently failing." },
    { label: "cron overdue", value: String(overview.activity.overdueCronJobs), detail: "Enabled jobs whose next run time is more than 30 minutes late." },
    { label: "memory pressure", value: overview.activity.memoryPressure.replace(/_/g, " "), detail: "Highest memory usage across files." },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Activity snapshot</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Recent activity across sessions, cron, and memory.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="rounded-lg border border-border/70 bg-bg/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className="mt-2 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
