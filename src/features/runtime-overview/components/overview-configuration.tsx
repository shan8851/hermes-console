import type { AccessCheckSummary, RuntimeOverviewSummary } from "@/features/runtime-overview/types";

const statusColor = (status: AccessCheckSummary["status"]) => {
  switch (status) {
    case "available":
      return "text-emerald-300";
    case "missing":
      return "text-rose-300";
    case "warning":
      return "text-amber-300";
    default:
      return "text-fg-muted";
  }
};

const dotColor = (status: AccessCheckSummary["status"]) => {
  switch (status) {
    case "available":
      return "bg-emerald-400";
    case "missing":
      return "bg-rose-400";
    case "warning":
      return "bg-amber-400";
    default:
      return "bg-fg-faint";
  }
};

function CredentialRow({ item }: { item: AccessCheckSummary }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={["inline-block h-2 w-2 shrink-0 rounded-full", dotColor(item.status)].join(" ")} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg-strong">{item.name}</p>
        <p className="text-xs text-fg-muted">{item.detail}</p>
      </div>
      <span className={["shrink-0 font-mono text-[11px] uppercase tracking-[0.16em]", statusColor(item.status)].join(" ")}>
        {item.status}
      </span>
    </div>
  );
}

export function OverviewConfiguration({ overview }: { overview: RuntimeOverviewSummary }) {
  const allCredentials = [
    ...overview.access.authProviders,
    ...overview.access.apiKeys,
  ];

  return (
    <section>
      <h3 className="mb-4 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
        Configuration
      </h3>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {overview.runtimeProfile.map((item) => (
          <article key={item.label} className="rounded-lg border border-border/70 bg-bg/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className="mt-2 text-sm font-medium text-fg-strong">{item.value}</p>
            {item.detail ? <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p> : null}
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border/70 bg-bg/40 divide-y divide-border/50">
        <div className="px-4 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">Credentials</p>
        </div>
        {allCredentials.map((item) => (
          <CredentialRow key={item.name} item={item} />
        ))}
      </div>
    </section>
  );
}
