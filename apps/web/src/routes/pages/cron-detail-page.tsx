import { useSuspenseQuery } from '@tanstack/react-query';

import { CronDetailView } from '@/features/cron/components/cron-detail-view';
import { cronDetailQueryOptions, cronQueryOptions } from '@/lib/api';

export const CronDetailPage = ({ agentId, jobId }: { agentId: string; jobId: string }) => {
  const query = useSuspenseQuery(
    cronDetailQueryOptions({
      agentId,
      jobId
    })
  );
  const cronIndex = useSuspenseQuery(cronQueryOptions());

  return (
    <CronDetailView
      detail={query.data.data}
      jobs={cronIndex.data.data.jobs}
      loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
    />
  );
};
