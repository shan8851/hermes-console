import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

const toneClass = (tone: "healthy" | "warning" | "critical" | "default") => {
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
};

export function OverviewGlance({ overview }: { overview: RuntimeOverviewSummary }) {
  const activityItems = [
    { label: "sessions", value: String(overview.activity.sessionCount), detail: "Total indexed sessions across agents.", tone: "default" as const },
    { label: "cron attention", value: String(overview.activity.cronAttentionJobs), detail: "Overdue, flaky, or failing jobs.", tone: "default" as const },
    { label: "cron overdue", value: String(overview.activity.overdueCronJobs), detail: "Next run more than 30 min late.", tone: "default" as const },
    { label: "memory pressure", value: overview.activity.memoryPressure.replace(/_/g, " "), detail: "Highest usage across files.", tone: "default" as const },
  ];

  const allItems = [
    ...overview.runtimeHealth.map((item) => ({
      label: item.label,
      value: item.value,
      detail: item.detail,
      tone: item.tone,
    })),
    ...activityItems,
  ];

  return (
    <section>
      <h3 className="mb-4 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
        At a glance
      </h3>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {allItems.map((item) => (
          <article key={item.label} className="rounded-lg border border-border/70 bg-bg/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className={["mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight", toneClass(item.tone)].join(" ")}>
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
