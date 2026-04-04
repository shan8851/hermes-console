import type { HermesAgentIdentity } from "@/features/inventory/discover-installation";

const presenceLabels: Array<keyof HermesAgentIdentity["presence"]> = [
  "config",
  "memory",
  "sessions",
  "cron",
  "skills",
  "stateDb",
];

export function AgentList({ agents }: { agents: HermesAgentIdentity[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface/70">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          Detected agents
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {agents.map((agent) => (
          <li key={`${agent.source}:${agent.id}`} className="px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-fg-strong">{agent.label}</p>
                  <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-faint">
                    {agent.source}
                  </span>
                  <span
                    className={[
                      "rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                      agent.isAvailable
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/25 bg-amber-500/10 text-amber-300",
                    ].join(" ")}
                  >
                    {agent.isAvailable ? "available" : "empty"}
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-fg-muted">
                  {agent.rootPath}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {presenceLabels.map((key) => (
                  <span
                    key={key}
                    className={[
                      "rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em]",
                      agent.presence[key]
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                        : "border-border bg-black/10 text-fg-faint",
                    ].join(" ")}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
