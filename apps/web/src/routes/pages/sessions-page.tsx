import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { SessionsBrowser } from '@/features/sessions/components/sessions-browser';
import { apiQueryKeys, sessionsQueryOptions } from '@/lib/api';

export const SessionsPage = ({
  initialAgentId,
  initialQuery
}: {
  initialAgentId: string;
  initialQuery: string;
}) => {
  const query = useSuspenseQuery(sessionsQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Session data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <SessionsBrowser
        initialAgentId={initialAgentId}
        initialQuery={initialQuery}
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        refreshQueryKeys={[apiQueryKeys.sessions]}
        sessions={query.data.data.sessions}
      />
    </div>
  );
};
