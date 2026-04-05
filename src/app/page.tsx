import { AgentList } from "@/features/inventory/components/agent-list";
import { readHermesInstallation } from "@/features/inventory/read-installation";
import { OverviewAccess } from "@/features/runtime-overview/components/overview-access";
import { OverviewActivity } from "@/features/runtime-overview/components/overview-activity";
import { OverviewAttention } from "@/features/runtime-overview/components/overview-attention";
import { OverviewHero } from "@/features/runtime-overview/components/overview-hero";
import { OverviewRuntimeHealth } from "@/features/runtime-overview/components/overview-runtime-health";
import { OverviewRuntimeProfile } from "@/features/runtime-overview/components/overview-runtime-profile";
import { OverviewSurfaces } from "@/features/runtime-overview/components/overview-surfaces";
import { readRuntimeOverview } from "@/features/runtime-overview/read-runtime-overview";

export default function Home() {
  const overview = readRuntimeOverview();
  const installation = readHermesInstallation();

  return (
    <div className="space-y-8">
      <OverviewHero overview={overview} />
      <OverviewAttention overview={overview} />
      <OverviewRuntimeHealth overview={overview} />
      <OverviewSurfaces overview={overview} />
      <OverviewAccess overview={overview} />
      <OverviewRuntimeProfile overview={overview} />
      <OverviewActivity overview={overview} />
      <AgentList agents={installation.agents} />
    </div>
  );
}
