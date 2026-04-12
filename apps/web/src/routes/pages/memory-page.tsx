import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { MemoryBrowser } from '@/features/memory/components/memory-browser';
import { apiQueryKeys, memoryQueryOptions } from '@/lib/api';

export const MemoryPage = () => {
  const query = useSuspenseQuery(memoryQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Memory data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      <MemoryBrowser
        loadedAt={query.data.meta.capturedAt}
        memory={query.data.data}
        refreshQueryKeys={[apiQueryKeys.memory]}
      />
    </div>
  );
};
