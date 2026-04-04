import { AgentList } from "@/features/inventory/components/agent-list";
import { InstallationStatusBadge } from "@/features/inventory/components/installation-status-badge";
import { InventorySummaryGrid } from "@/features/inventory/components/inventory-summary-grid";
import { readHermesInstallation } from "@/features/inventory/read-installation";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Setup",
  "Inventory, roots, providers, and runtime posture.",
);

export default function SetupPage() {
  const installation = readHermesInstallation();

  const summaryItems = [
    {
      label: "installation status",
      value:
        installation.status === "ready"
          ? "Hermes install detected and at least one agent looks usable."
          : installation.status === "partial"
            ? "Hermes root exists, but the runtime surfaces look incomplete."
            : "Hermes root is missing from the resolved path.",
      tone: "muted" as const,
    },
    {
      label: "hermes root",
      value: `${installation.paths.hermesRoot.path} (${installation.paths.hermesRoot.kind})`,
      tone: "default" as const,
    },
    {
      label: "workspace root",
      value: `${installation.paths.workspaceRoot.path} (${installation.paths.workspaceRoot.kind})`,
      tone: "default" as const,
    },
    {
      label: "agents available",
      value: `${installation.availableAgentCount} of ${installation.agents.length}`,
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            Setup
          </p>
          <InstallationStatusBadge status={installation.status} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Answer what kind of Hermes setup this actually is
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          This page now reads the resolved Hermes root, checks for the core runtime
          surfaces we depend on, and detects both the default install and any profile
          agents under <span className="font-mono text-xs text-fg">profiles/</span>.
        </p>
      </section>

      <InventorySummaryGrid items={summaryItems} />

      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          Discovery assumptions
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-fg-muted">
          <li>- Default Hermes root resolves to <span className="font-mono text-xs text-fg">~/.hermes</span> unless overridden.</li>
          <li>- Profile agents are discovered from <span className="font-mono text-xs text-fg">&lt;hermesRoot&gt;/profiles/*</span>.</li>
          <li>- Agent availability is currently inferred from config, memory, sessions, cron, skills, and state DB presence.</li>
        </ul>
      </section>

      <AgentList agents={installation.agents} />
    </div>
  );
}
