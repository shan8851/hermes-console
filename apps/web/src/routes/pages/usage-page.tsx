import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { getProfileScopeLabel, resolveProfileScope } from '@/features/profile-scope/profile-scope';
import { UsageBrowser } from '@/features/usage/components/usage-browser';
import { apiQueryKeys, inventoryQueryOptions, usageQueryOptions } from '@/lib/api';
import type { ProfileScopeId } from '@/features/profile-scope/profile-scope';

export const UsagePage = ({ profileScope }: { profileScope: ProfileScopeId }) => {
  const query = useSuspenseQuery(usageQueryOptions());
  const inventory = useSuspenseQuery(inventoryQueryOptions());
  const resolvedProfileScope = resolveProfileScope({
    agents: inventory.data.data.agents,
    value: profileScope
  });
  const profileScopeLabel = getProfileScopeLabel({
    agents: inventory.data.data.agents,
    scope: resolvedProfileScope
  });

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Usage data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <UsageBrowser
        profileScope={resolvedProfileScope}
        profileScopeLabel={profileScopeLabel}
        refreshQueryKeys={[apiQueryKeys.usage]}
        usage={query.data.data}
      />
    </div>
  );
};
