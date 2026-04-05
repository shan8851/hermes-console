import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

export function OverviewActivity({ overview }: { overview: RuntimeOverviewSummary }) {
  const items = [
    { label: "sessions", value: String(overview.activity.sessionCount), detail: "Recent cross-agent session count currently indexed." },
    { label: "cron failing", value: String(overview.activity.failingCronJobs), detail: "Jobs with explicit errors or failing last-run state." },
    { label: "cron contentful", value: String(overview.activity.contentfulCronJobs), detail: "Jobs whose latest output has actual content worth opening." },
    { label: "memory pressure", value: overview.activity.memoryPressure.replace(/_/g, " "), detail: "Highest pressure across MEMORY.md and USER.md." },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Activity snapshot</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Useful secondary signal only. Heavy detail still belongs to Sessions and Cron.</p>
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
