import { useQuery } from "@tanstack/react-query";

import { appMetaQueryOptions } from "@/lib/api";

function gatewayClass(state: string) {
  if (state === "running") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }

  if (state === "stopped") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-200";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-200";
}

export function AppTopbar() {
  const appMetaQuery = useQuery({
    ...appMetaQueryOptions(),
    retry: false,
  });

  if (appMetaQuery.isPending) {
    return (
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-end gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-fg-muted">
          <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1">
            loading runtime
          </span>
        </div>
      </header>
    );
  }

  if (appMetaQuery.isError || !appMetaQuery.data) {
    return (
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-end gap-2 font-[family-name:var(--font-jetbrains)] text-xs text-amber-200">
          <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1">
            runtime metadata unavailable
          </span>
        </div>
      </header>
    );
  }

  const { data } = appMetaQuery;

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
        <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">
          {data.rootKind === "env_override" ? "custom root" : "default root"}
        </span>
        <span className="max-w-[14rem] truncate rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">
          {data.rootPath}
        </span>
        <span className={["rounded-md border px-2 py-1", gatewayClass(data.gatewayState)].join(" ")}>
          gateway {data.gatewayState}
        </span>
        <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">
          {data.connectedPlatformCount} live
        </span>
        <span className="rounded-md border border-border/80 bg-bg/40 px-2 py-1 text-fg-muted">
          {data.updateStatus === "behind"
            ? `${data.updateBehind} behind`
            : data.updateStatus === "up_to_date"
              ? "up to date"
              : "update unknown"}
        </span>
        <span
          className={[
            "rounded-md border px-2 py-1",
            data.installStatus === "ready"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : data.installStatus === "missing"
                ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
                : "border-amber-500/25 bg-amber-500/10 text-amber-200",
          ].join(" ")}
        >
          install {data.installStatus}
        </span>
      </div>
    </header>
  );
}
