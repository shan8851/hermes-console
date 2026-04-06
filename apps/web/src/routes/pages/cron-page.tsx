import { useSuspenseQuery } from "@tanstack/react-query";

import { QueryStatusCard } from "@/components/ui/query-status-card";
import { CronBrowser } from "@/features/cron/components/cron-browser";
import { apiQueryKeys, cronQueryOptions } from "@/lib/api";

export const CronPage = () => {
  const query = useSuspenseQuery(cronQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard
        title="Cron data quality"
        status={query.data.meta.dataStatus}
        issues={query.data.issues}
      />
      <CronBrowser
        jobs={query.data.data.jobs}
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        refreshQueryKeys={[apiQueryKeys.cron]}
      />
    </div>
  );
};
