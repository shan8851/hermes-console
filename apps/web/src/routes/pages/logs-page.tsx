import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { LogsBrowser } from '@/features/logs/components/logs-browser';
import { isAllProfilesScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import { apiQueryKeys, logsQueryOptions } from '@/lib/api';

export const LogsPage = ({ profileScope }: { profileScope: ProfileScopeId }) => {
  const query = useSuspenseQuery(logsQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Log discovery quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      {!isAllProfilesScope(profileScope) ? (
        <p className="rounded-lg border border-border/70 bg-surface/60 px-4 py-3 text-sm leading-6 text-fg-muted">
          Logs are currently discovered at the runtime log-file level, so profile scope does not filter this view yet.
        </p>
      ) : null}
      <LogsBrowser
        eventSummary={query.data.data.eventSummary}
        logs={query.data.data.logs}
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        refreshQueryKeys={[apiQueryKeys.logs]}
      />
    </div>
  );
};
