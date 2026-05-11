import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { MemoryBrowser } from '@/features/memory/components/memory-browser';
import { resolveProfileScope } from '@/features/profile-scope/profile-scope';
import { apiQueryKeys, inventoryQueryOptions, memoryQueryOptions } from '@/lib/api';
import type { ProfileScopeId } from '@/features/profile-scope/profile-scope';

export const MemoryPage = ({ profileScope }: { profileScope: ProfileScopeId }) => {
  const query = useSuspenseQuery(memoryQueryOptions());
  const inventory = useSuspenseQuery(inventoryQueryOptions());
  const resolvedProfileScope = resolveProfileScope({
    agents: inventory.data.data.agents,
    value: profileScope
  });

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Memory data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <MemoryBrowser
        loadedAt={query.data.meta.capturedAt}
        memory={query.data.data}
        profileScope={resolvedProfileScope}
        refreshQueryKeys={[apiQueryKeys.memory]}
      />
    </div>
  );
};
