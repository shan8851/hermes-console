import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

const toneDot = (tone: "critical" | "warning" | "info") => {
  switch (tone) {
    case "critical":
      return "bg-rose-400";
    case "warning":
      return "bg-amber-400";
    default:
      return "bg-sky-400";
  }
};

export function OverviewAttention({ overview }: { overview: RuntimeOverviewSummary }) {
  if (overview.warnings.length === 0) return null;

  return (
    <section>
      <h3 className="mb-4 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
        Notices
      </h3>
      <div className="rounded-lg border border-border/70 bg-bg/40 divide-y divide-border/50">
        {overview.warnings.map((warning) => (
          <article key={warning.id} className="flex gap-3 px-4 py-3">
            <span className={["mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full", toneDot(warning.tone)].join(" ")} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg-strong">{warning.title}</p>
              <p className="mt-0.5 text-sm leading-6 text-fg-muted">{warning.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
