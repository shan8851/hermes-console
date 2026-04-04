import { InstallationStatusBadge } from "@/features/inventory/components/installation-status-badge";
import { InventorySummaryGrid } from "@/features/inventory/components/inventory-summary-grid";
import { readHermesInstallation } from "@/features/inventory/read-installation";

export default function Home() {
  const installation = readHermesInstallation();

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Overview
          </p>
          <InstallationStatusBadge status={installation.status} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          See the Hermes setup before you poke at it
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          The overview now starts with a real inventory snapshot instead of pure placeholder
          copy. It is still intentionally narrow: roots, install posture, and agent count first.
        </p>
      </section>

      <InventorySummaryGrid
        items={[
          {
            label: "status",
            value: installation.status,
          },
          {
            label: "hermes root",
            value: installation.paths.hermesRoot.path,
          },
          {
            label: "workspace root",
            value: installation.paths.workspaceRoot.path,
          },
          {
            label: "agents available",
            value: `${installation.availableAgentCount} of ${installation.agents.length}`,
          },
        ]}
      />

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-border bg-surface/70 p-3">
          <p className="text-sm leading-6 text-fg">Setup now uses the real discovery reader rather than static bullets.</p>
        </article>
        <article className="rounded-lg border border-border bg-surface/70 p-3">
          <p className="text-sm leading-6 text-fg">Profile agents under <span className="font-mono text-xs">profiles/</span> are included in the count.</p>
        </article>
        <article className="rounded-lg border border-border bg-surface/70 p-3">
          <p className="text-sm leading-6 text-fg">Next up: deeper setup summaries and then memory, skills, sessions, and cron surfaces.</p>
        </article>
      </section>
    </div>
  );
}
