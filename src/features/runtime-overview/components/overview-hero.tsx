import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

function verdictClasses(status: RuntimeOverviewSummary["verdict"]["status"]) {
  switch (status) {
    case "solid":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "broken":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
}

export function OverviewHero({ overview }: { overview: RuntimeOverviewSummary }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Overview</p>
          <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">
            Is the bird&apos;s-eye view of this Hermes setup solid?
          </h2>
          <p className="mt-3 text-sm leading-7 text-fg-muted sm:text-[15px]">{overview.verdict.summary}</p>
          <p className="mt-3 text-xs text-fg-faint">
            Snapshot {overview.capturedAt ? new Date(overview.capturedAt).toLocaleString() : "time unknown"}
          </p>
        </div>

        <div className={["rounded-xl border px-4 py-3 text-right", verdictClasses(overview.verdict.status)].join(" ")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Verdict</p>
          <p className="mt-2 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight">{overview.verdict.label}</p>
          <p className="mt-1 text-sm opacity-90">{overview.doctorIssueCount} doctor issue{overview.doctorIssueCount === 1 ? "" : "s"}</p>
        </div>
      </div>
    </section>
  );
}
