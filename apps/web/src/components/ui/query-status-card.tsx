import type { HermesQueryIssue, HermesQueryStatus } from "@hermes-console/runtime";

function containerClass(status: HermesQueryStatus) {
  switch (status) {
    case "missing":
      return "border-rose-500/30 bg-rose-500/10";
    case "partial":
      return "border-amber-500/30 bg-amber-500/10";
    default:
      return "border-border/80 bg-surface/70";
  }
}

function issueClass(severity: HermesQueryIssue["severity"]) {
  switch (severity) {
    case "error":
      return "border-rose-500/30 bg-rose-500/10 text-rose-100";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-border/80 bg-bg/40 text-fg-muted";
  }
}

function statusLabel(status: HermesQueryStatus) {
  switch (status) {
    case "missing":
      return "Missing data";
    case "partial":
      return "Partial data";
    default:
      return "Live data";
  }
}

export function QueryStatusCard({
  title,
  status,
  issues,
}: {
  title: string;
  status: HermesQueryStatus;
  issues: HermesQueryIssue[];
}) {
  if (status === "ready" && issues.length === 0) {
    return null;
  }

  return (
    <section
      className={[
        "rounded-lg border p-4",
        containerClass(status),
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          {title}
        </p>
        <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {issues.map((issue) => (
          <article
            key={issue.id}
            className={[
              "rounded-md border p-3",
              issueClass(issue.severity),
            ].join(" ")}
          >
            <p className="text-sm font-medium text-fg-strong">{issue.summary}</p>
            <p className="mt-2 text-sm leading-6 text-current">{issue.detail}</p>
            {issue.path ? (
              <p className="mt-2 break-all font-mono text-xs text-fg-faint">
                {issue.path}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
