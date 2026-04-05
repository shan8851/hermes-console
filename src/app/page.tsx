import { AgentList } from "@/features/inventory/components/agent-list";
import { readHermesInstallation } from "@/features/inventory/read-installation";
import { OverviewAttention } from "@/features/runtime-overview/components/overview-attention";
import { OverviewConfiguration } from "@/features/runtime-overview/components/overview-configuration";
import { OverviewGlance } from "@/features/runtime-overview/components/overview-glance";
import { OverviewHero } from "@/features/runtime-overview/components/overview-hero";
import { OverviewSurfaces } from "@/features/runtime-overview/components/overview-surfaces";
import { readRuntimeOverview } from "@/features/runtime-overview/read-runtime-overview";

export default function Home() {
  const overview = readRuntimeOverview();
  const installation = readHermesInstallation();

  return (
    <div className="space-y-10">
      <OverviewHero overview={overview} />
      <OverviewAttention overview={overview} />
      <OverviewGlance overview={overview} />
      <OverviewSurfaces overview={overview} />
      <OverviewConfiguration overview={overview} />
      <AgentList agents={installation.agents} />
    </div>
  );
}
