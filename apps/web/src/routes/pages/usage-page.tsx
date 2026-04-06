import { useSuspenseQuery } from "@tanstack/react-query";

import { QueryStatusCard } from "@/components/ui/query-status-card";
import { UsageBrowser } from "@/features/usage/components/usage-browser";
import { apiQueryKeys, usageQueryOptions } from "@/lib/api";

export const UsagePage = () => {
  const query = useSuspenseQuery(usageQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard
        title="Usage data quality"
        status={query.data.meta.dataStatus}
        issues={query.data.issues}
      />
      <UsageBrowser
        refreshQueryKeys={[apiQueryKeys.usage]}
        usage={query.data.data}
      />
    </div>
  );
};
