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

function gatewayClass(state: string) {
  return state === "running"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    : "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

export function AppTopbar() {
  const overview = readRuntimeOverview();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-end gap-2 font-[family-name:var(--font-jetbrains)] text-xs">
        <a
          href="https://github.com/shan8851/hermes-console"
          target="_blank"
          rel="noreferrer"
          aria-label="Hermes Console on GitHub"
          className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-fg"
        >
          GitHub
        </a>
        <span className={["rounded-md px-2 py-1", verdictClass(overview.verdict.status)].join(" ")}>
          {overview.verdict.label}
        </span>
        <span className={["rounded-md border px-2 py-1", gatewayClass(overview.gatewayState)].join(" ")}>
          gateway {overview.gatewayState}
        </span>
        <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">
          {overview.updateStatus === "behind"
            ? `${overview.updateBehind} behind`
            : overview.updateStatus === "up_to_date"
              ? "up to date"
              : "update unknown"}
        </span>
      </div>
    </header>
  );
}
