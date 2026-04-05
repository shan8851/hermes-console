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

  return (
    <div className="space-y-8">
      <OverviewHero overview={overview} />
      <OverviewAttention overview={overview} />
      <OverviewRuntimeHealth overview={overview} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <OverviewSurfaces overview={overview} />
        <OverviewAccess overview={overview} />
      </div>
      <OverviewRuntimeProfile overview={overview} />
      <OverviewActivity overview={overview} />
    </div>
  );
}
