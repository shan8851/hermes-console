import type { RuntimeOverviewSummary } from "@/features/runtime-overview/types";

function statusPill(configured: boolean, live: boolean | null) {
  if (!configured) {
    return { label: "not configured", className: "border-border/80 bg-bg/40 text-fg-muted" };
  }
  if (live === true) {
    return { label: "live", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
  }
  if (live === false) {
    return { label: "configured", className: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
  }
  return { label: "unknown", className: "border-border/80 bg-bg/40 text-fg-muted" };
}

export function OverviewSurfaces({ overview }: { overview: RuntimeOverviewSummary }) {
  const configured = overview.platforms.filter((platform) => platform.configured);
  const unconfigured = overview.platforms.filter((platform) => !platform.configured);

  return (
    <section className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">Connected surfaces</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Which messaging surfaces are configured, which ones look live right now, and which defaults change behaviour in practice.</p>
      </div>

      {configured.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {configured.map((platform) => {
            const pill = statusPill(platform.configured, platform.live);
            return (
              <article key={platform.name} className="rounded-lg border border-border/70 bg-bg/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-[family-name:var(--font-bricolage)] text-lg font-medium text-fg-strong">{platform.name}</p>
                  <span className={["rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em]", pill.className].join(" ")}>{pill.label}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-fg-muted">{platform.detail}</p>
                {platform.defaults.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {platform.defaults.map((item) => (
                      <span key={item} className="rounded-md border border-border/70 bg-surface px-2 py-1 font-mono text-[11px] text-fg-muted">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No configured messaging surfaces were detected from the current snapshot.
        </div>
      )}

      {unconfigured.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">Not configured</p>
          <div className="flex flex-wrap gap-2">
            {unconfigured.map((platform) => (
              <span key={platform.name} className="rounded-md border border-border/70 bg-bg/40 px-2.5 py-1 text-xs text-fg-muted">
                {platform.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
