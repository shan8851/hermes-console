import { useSuspenseQuery } from "@tanstack/react-query";

import { QueryStatusCard } from "@/components/ui/query-status-card";
import { SkillsBrowser } from "@/features/skills/components/skills-browser";
import { apiQueryKeys, skillsQueryOptions } from "@/lib/api";

export const SkillsPage = () => {
  const query = useSuspenseQuery(skillsQueryOptions());

  return (
    <div className="space-y-6">
      <QueryStatusCard
        title="Skills data quality"
        status={query.data.meta.dataStatus}
        issues={query.data.issues}
      />
      <SkillsBrowser
        loadedAt={query.data.meta.capturedAt ?? new Date().toISOString()}
        refreshQueryKeys={[apiQueryKeys.skills]}
        skills={query.data.data.skills}
      />
    </div>
  );
};
