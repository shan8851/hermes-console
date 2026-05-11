import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryStatusCard } from '@/components/ui/query-status-card';
import { isAllProfilesScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import { SkillsBrowser } from '@/features/skills/components/skills-browser';
import { apiQueryKeys, skillsQueryOptions } from '@/lib/api';

export const SkillsPage = ({ profileScope }: { profileScope: ProfileScopeId }) => {
  const query = useSuspenseQuery(skillsQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard title="Skills data quality" status={query.data.meta.dataStatus} issues={query.data.issues} />
      {!isAllProfilesScope(profileScope) ? (
        <p className="rounded-lg border border-border/70 bg-surface/60 px-4 py-3 text-sm leading-6 text-fg-muted">
          Skills are currently read from the configured skills root, so profile scope does not filter this view yet.
        </p>
      ) : null}
      <SkillsBrowser
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        refreshQueryKeys={[apiQueryKeys.skills]}
        skills={query.data.data.skills}
      />
    </div>
  );
};
