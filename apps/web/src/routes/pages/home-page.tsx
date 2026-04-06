import { useSuspenseQuery } from "@tanstack/react-query";

import { QueryStatusCard } from "@/components/ui/query-status-card";
import {
  apiQueryKeys,
  inventoryQueryOptions,
  overviewQueryOptions,
} from "@/lib/api";
import { AgentList } from "@/features/inventory/components/agent-list";
import { OverviewAttention } from "@/features/runtime-overview/components/overview-attention";
import { OverviewConfiguration } from "@/features/runtime-overview/components/overview-configuration";
import { OverviewDiagnostics } from "@/features/runtime-overview/components/overview-diagnostics";
import { OverviewGlance } from "@/features/runtime-overview/components/overview-glance";
import { OverviewHero } from "@/features/runtime-overview/components/overview-hero";
import { OverviewSurfaces } from "@/features/runtime-overview/components/overview-surfaces";

export const HomePage = () => {
  const overview = useSuspenseQuery(overviewQueryOptions());
  const inventory = useSuspenseQuery(inventoryQueryOptions());

  return (
    <div className="space-y-10">
      <QueryStatusCard
        title="Overview data quality"
        status={overview.data.meta.dataStatus}
        issues={overview.data.issues}
      />
      <OverviewHero
        overview={overview.data.data}
        refreshQueryKeys={[
          apiQueryKeys.overview,
          apiQueryKeys.inventory,
          apiQueryKeys.diagnostics,
        ]}
      />
      <OverviewDiagnostics />
      <OverviewAttention overview={overview.data.data} />
      <OverviewGlance overview={overview.data.data} />
      <OverviewSurfaces overview={overview.data.data} />
      <OverviewConfiguration overview={overview.data.data} />
      <AgentList agents={inventory.data.data.agents} />
    </div>
  );
};
