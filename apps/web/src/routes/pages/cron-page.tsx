import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { CronBrowser } from '@/features/cron/components/cron-browser';
import { resolveProfileScope } from '@/features/profile-scope/profile-scope';
import { apiQueryKeys, cronQueryOptions, inventoryQueryOptions } from '@/lib/api';
import type { ProfileScopeId } from '@/features/profile-scope/profile-scope';

export const CronPage = ({ profileScope }: { profileScope: ProfileScopeId }) => {
  const query = useSuspenseQuery(cronQueryOptions());
  const inventory = useSuspenseQuery(inventoryQueryOptions());
  const resolvedProfileScope = resolveProfileScope({
    agents: inventory.data.data.agents,
    value: profileScope
  });

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Cron data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <CronBrowser
        jobs={query.data.data.jobs}
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        profileScope={resolvedProfileScope}
        refreshQueryKeys={[apiQueryKeys.cron]}
      />
    </div>
  );
};
