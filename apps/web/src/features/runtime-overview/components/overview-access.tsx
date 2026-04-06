import type { AccessCheckSummary, RuntimeOverviewSummary } from "@hermes-console/runtime";

function statusClasses(status: AccessCheckSummary["status"]) {
  switch (status) {
    case "available":
      return "text-emerald-200 border-emerald-500/25 bg-emerald-500/10";
    case "missing":
      return "text-rose-200 border-rose-500/25 bg-rose-500/10";
    case "warning":
      return "text-amber-200 border-amber-500/25 bg-amber-500/10";
    default:
      return "text-fg-muted border-border/70 bg-bg/40";
  }
}

function AccessColumn({ title, items }: { title: string; items: AccessCheckSummary[] }) {
  return (
    <article className="rounded-lg border border-border/70 bg-bg/40 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{title}</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.name} className={["rounded-lg border p-3", statusClasses(item.status)].join(" ")}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-current">{item.name}</p>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] opacity-80">{item.status}</span>
            </div>
            <p className="mt-2 text-sm leading-6 opacity-85">{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export function OverviewAccess({ overview }: { overview: RuntimeOverviewSummary }) {
  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Access</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Authentication and API credentials available to Hermes.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AccessColumn title="auth providers" items={overview.access.authProviders} />
        <AccessColumn title="api and tool access" items={overview.access.apiKeys} />
      </div>
    </section>
  );
}
