import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { SessionDetailView } from '@/features/sessions/components/session-detail/session-detail-view';
import { sessionDetailQueryOptions } from '@/lib/api';

export const SessionDetailPage = ({ agentId, sessionId }: { agentId: string; sessionId: string }) => {
  const query = useSuspenseQuery(
    sessionDetailQueryOptions({
      agentId,
      sessionId
    })
  );

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Session detail quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <SessionDetailView detail={query.data.data} />
    </div>
  );
};
