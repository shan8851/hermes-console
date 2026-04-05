import { readRuntimeOverview } from "@/features/runtime-overview/read-runtime-overview";

function verdictClass(status: ReturnType<typeof readRuntimeOverview>["verdict"]["status"]) {
  switch (status) {
    case "solid":
      return "bg-emerald-500/10 text-emerald-200";
    case "broken":
      return "bg-rose-500/10 text-rose-200";
    default:
      return "bg-amber-500/10 text-amber-200";
  }
}

export function AppTopbar() {
  const overview = readRuntimeOverview();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-bricolage)] text-sm font-semibold tracking-tight text-fg-strong">
          Hermes Console
        </h1>

        <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-fg-faint">
          <span className="rounded-md bg-accent/10 px-2 py-1 text-accent">~/.hermes</span>
          <span className={["rounded-md px-2 py-1", verdictClass(overview.verdict.status)].join(" ")}>{overview.verdict.label}</span>
          <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">gateway {overview.gatewayState}</span>
          <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">
            {overview.updateStatus === "behind" ? `${overview.updateBehind} behind` : overview.updateStatus === "up_to_date" ? "up to date" : "update unknown"}
          </span>
          <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">{overview.connectedPlatforms.length} live surface{overview.connectedPlatforms.length === 1 ? "" : "s"}</span>
          <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">{overview.doctorIssueCount} doctor issue{overview.doctorIssueCount === 1 ? "" : "s"}</span>
        </div>
      </div>
    </header>
  );
}
