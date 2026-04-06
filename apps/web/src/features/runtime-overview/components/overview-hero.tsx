import type { QueryKey } from "@tanstack/react-query";

import { RefreshButton } from "@/components/ui/refresh-button";
import type { RuntimeOverviewSummary } from "@hermes-console/runtime";

const verdictChipClasses = (status: RuntimeOverviewSummary["verdict"]["status"]) => {
  switch (status) {
    case "solid":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "broken":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }
};

export function OverviewHero({
  overview,
  refreshQueryKeys,
}: {
  overview: RuntimeOverviewSummary;
  refreshQueryKeys: QueryKey[];
}) {
  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Overview</p>
        <span className={["rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em]", verdictChipClasses(overview.verdict.status)].join(" ")}>
          {overview.verdict.label}
        </span>
        <RefreshButton
          loadedAt={overview.capturedAt ?? new Date().toISOString()}
          queryKeys={refreshQueryKeys}
        />
      </div>
      <h2 className="mt-4 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">
        Overview
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-fg-muted">
        {overview.verdict.summary}
      </p>
      <p className="mt-2 text-xs text-fg-faint">
        Snapshot {overview.capturedAt ? new Date(overview.capturedAt).toLocaleString() : "time unknown"}
        {overview.doctorIssueCount > 0 ? ` \u00b7 ${overview.doctorIssueCount} doctor issue${overview.doctorIssueCount === 1 ? "" : "s"}` : ""}
      </p>
    </section>
  );
}
