import { useSuspenseQuery } from "@tanstack/react-query";

import { CronDetailView } from "@/features/cron/components/cron-detail-view";
import { cronDetailQueryOptions } from "@/lib/api";

export const CronDetailPage = ({
  agentId,
  jobId,
}: {
  agentId: string;
  jobId: string;
}) => {
  const query = useSuspenseQuery(
    cronDetailQueryOptions({
      agentId,
      jobId,
    }),
  );

  return <CronDetailView detail={query.data.data} />;
};
