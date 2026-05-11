import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { resolveProfileScope } from '@/features/profile-scope/profile-scope';
import { SessionsBrowser } from '@/features/sessions/components/sessions-browser';
import { apiQueryKeys, inventoryQueryOptions, sessionsQueryOptions } from '@/lib/api';
import type { ProfileScopeId } from '@/features/profile-scope/profile-scope';

export const SessionsPage = ({
  initialQuery,
  profileScope
}: {
  initialQuery: string;
  profileScope: ProfileScopeId;
}) => {
  const query = useSuspenseQuery(sessionsQueryOptions());
  const inventory = useSuspenseQuery(inventoryQueryOptions());
  const resolvedProfileScope = resolveProfileScope({
    agents: inventory.data.data.agents,
    value: profileScope
  });

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Session data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <SessionsBrowser
        initialQuery={initialQuery}
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        profileScope={resolvedProfileScope}
        refreshQueryKeys={[apiQueryKeys.sessions]}
        sessions={query.data.data.sessions}
      />
    </div>
  );
};
