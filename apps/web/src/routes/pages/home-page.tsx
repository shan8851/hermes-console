import { useSuspenseQuery } from '@tanstack/react-query';

import {
  filterByProfileScope,
  getProfileScopeLabel,
  isAllProfilesScope,
  resolveProfileScope,
  type ProfileScopeId
} from '@/features/profile-scope/profile-scope';
import {
  apiQueryKeys,
  cronQueryOptions,
  inventoryQueryOptions,
  memoryQueryOptions,
  overviewQueryOptions,
  sessionsQueryOptions
} from '@/lib/api';
import { AgentList } from '@/features/inventory/components/agent-list';
import { OverviewAttention } from '@/features/runtime-overview/components/overview-attention';
import { OverviewConfiguration } from '@/features/runtime-overview/components/overview-configuration';
import { OverviewCronHealth } from '@/features/runtime-overview/components/overview-cron-health';
import { OverviewDiagnostics } from '@/features/runtime-overview/components/overview-diagnostics';
import { OverviewGlance } from '@/features/runtime-overview/components/overview-glance';
import { OverviewHero } from '@/features/runtime-overview/components/overview-hero';
import { OverviewRuntimeInstall } from '@/features/runtime-overview/components/overview-runtime-install';
import { OverviewSurfaces } from '@/features/runtime-overview/components/overview-surfaces';

import {
  sortAttentionItems,
  type AgentMemoryReadResult,
  type MemoryPressureLevel,
  type RuntimeOverviewSummary
} from '@hermes-console/runtime';

const MEMORY_PRESSURE_RANK: Record<MemoryPressureLevel, number> = {
  healthy: 0,
  approaching_limit: 1,
  near_limit: 2,
  at_limit: 3
};

const maxMemoryPressure = (left: MemoryPressureLevel, right: MemoryPressureLevel): MemoryPressureLevel =>
  MEMORY_PRESSURE_RANK[right] > MEMORY_PRESSURE_RANK[left] ? right : left;

const getAgentMemoryPressure = (agent: AgentMemoryReadResult): MemoryPressureLevel =>
  maxMemoryPressure(agent.files.memory.pressureLevel, agent.files.user.pressureLevel);

const getScopedMemoryPressure = (agents: AgentMemoryReadResult[]): MemoryPressureLevel =>
  agents.map(getAgentMemoryPressure).reduce(maxMemoryPressure, 'healthy');

const createScopedMemoryAttentionItem = (
  memoryPressure: MemoryPressureLevel
): RuntimeOverviewSummary['attentionItems'][number] | null => {
  if (memoryPressure !== 'near_limit' && memoryPressure !== 'at_limit') {
    return null;
  }

  return {
    id: 'memory:pressure:scoped',
    severity: memoryPressure === 'at_limit' ? 'critical' : 'warning',
    domain: 'memory',
    title: `Memory pressure is ${memoryPressure.replace(/_/g, ' ')}`,
    summary: 'At least one memory file in the selected profile is close to its configured limit.',
    href: '/memory',
    isActionable: true,
    isOptionalSurface: false
  };
};

const isProfileScopedAttentionDomain = (domain: RuntimeOverviewSummary['attentionItems'][number]['domain']) =>
  domain === 'config' || domain === 'cron' || domain === 'files' || domain === 'memory' || domain === 'sessions';

const buildScopedAttentionItems = ({
  attentionItems,
  memoryPressure,
  profileScope
}: {
  attentionItems: RuntimeOverviewSummary['attentionItems'];
  memoryPressure: MemoryPressureLevel;
  profileScope: ProfileScopeId;
}): RuntimeOverviewSummary['attentionItems'] => {
  if (isAllProfilesScope(profileScope)) {
    return attentionItems;
  }

  const scopedItems = attentionItems.filter((item) => {
    if (item.profileId) {
      return item.profileId === profileScope;
    }

    return !isProfileScopedAttentionDomain(item.domain);
  });
  const memoryAttention = createScopedMemoryAttentionItem(memoryPressure);

  return sortAttentionItems(memoryAttention ? [...scopedItems, memoryAttention] : scopedItems);
};

const buildScopedActivity = ({
  cronJobs,
  memoryAgents,
  overview,
  profileScope,
  sessions
}: {
  cronJobs: Array<{
    agentId: string;
    attentionLevel: string;
    latestOutputState: string;
    overdue: boolean;
  }>;
  memoryAgents: AgentMemoryReadResult[];
  overview: RuntimeOverviewSummary;
  profileScope: ProfileScopeId;
  sessions: Array<{ agentId: string }>;
}): RuntimeOverviewSummary['activity'] => {
  if (isAllProfilesScope(profileScope)) {
    return overview.activity;
  }

  const scopedSessions = filterByProfileScope({
    items: sessions,
    scope: profileScope
  });
  const scopedCronJobs = filterByProfileScope({
    items: cronJobs,
    scope: profileScope
  });
  const scopedMemoryAgents = filterByProfileScope({
    items: memoryAgents,
    scope: profileScope
  });

  return {
    sessionCount: scopedSessions.length,
    cronAttentionJobs: scopedCronJobs.filter(
      (job) => job.attentionLevel === 'warning' || job.attentionLevel === 'critical'
    ).length,
    overdueCronJobs: scopedCronJobs.filter((job) => job.overdue).length,
    contentfulCronJobs: scopedCronJobs.filter((job) => job.latestOutputState === 'contentful').length,
    memoryPressure: getScopedMemoryPressure(scopedMemoryAgents)
  };
};

export const HomePage = ({ profileScope }: { profileScope: ProfileScopeId }) => {
  const overview = useSuspenseQuery(overviewQueryOptions());
  const inventory = useSuspenseQuery(inventoryQueryOptions());
  const sessions = useSuspenseQuery(sessionsQueryOptions());
  const cron = useSuspenseQuery(cronQueryOptions());
  const memory = useSuspenseQuery(memoryQueryOptions());
  const resolvedProfileScope = resolveProfileScope({
    agents: inventory.data.data.agents,
    value: profileScope
  });
  const visibleAgents = isAllProfilesScope(resolvedProfileScope)
    ? inventory.data.data.agents
    : inventory.data.data.agents.filter((agent) => agent.id === resolvedProfileScope);
  const profileScopeLabel = getProfileScopeLabel({
    agents: inventory.data.data.agents,
    scope: resolvedProfileScope
  });
  const scopedSessions = filterByProfileScope({
    items: sessions.data.data.sessions,
    scope: resolvedProfileScope
  });
  const scopedCronJobs = filterByProfileScope({
    items: cron.data.data.jobs,
    scope: resolvedProfileScope
  });
  const scopedActivity = buildScopedActivity({
    cronJobs: cron.data.data.jobs,
    memoryAgents: memory.data.data.agents,
    overview: overview.data.data,
    profileScope: resolvedProfileScope,
    sessions: sessions.data.data.sessions
  });
  const visibleOverview = {
    ...overview.data.data,
    activity: scopedActivity,
    attentionItems: buildScopedAttentionItems({
      attentionItems: overview.data.data.attentionItems,
      memoryPressure: scopedActivity.memoryPressure,
      profileScope: resolvedProfileScope
    })
  };

  return (
    <div className="space-y-10">
      {!isAllProfilesScope(resolvedProfileScope) ? (
        <section className="rounded-lg border border-accent/25 bg-accent/8 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              Profile: {profileScopeLabel}
            </span>
            <p className="text-sm leading-6 text-fg-muted">
              Activity cards and profile-aware sections are scoped to {profileScopeLabel}. Runtime, gateway, and update
              cards remain global; Diagnostics labels scoped counts separately from global CLI state.
            </p>
          </div>
        </section>
      ) : null}
      <OverviewHero
        overview={overview.data.data}
        refreshQueryKeys={[
          apiQueryKeys.overview,
          apiQueryKeys.inventory,
          apiQueryKeys.sessions,
          apiQueryKeys.cron,
          apiQueryKeys.memory,
          apiQueryKeys.diagnostics
        ]}
      />
      <OverviewGlance isActivityScoped={!isAllProfilesScope(resolvedProfileScope)} overview={visibleOverview} />
      <OverviewCronHealth
        jobs={scopedCronJobs}
        loadedAt={cron.data.meta.capturedAt ?? new Date().toISOString()}
        profileScope={resolvedProfileScope}
      />
      <OverviewRuntimeInstall overview={overview.data.data} />
      <OverviewAttention overview={visibleOverview} profileScope={resolvedProfileScope} />
      <OverviewDiagnostics
        overviewIssues={overview.data.issues}
        scope={{
          isScoped: !isAllProfilesScope(resolvedProfileScope),
          label: profileScopeLabel,
          cronJobs: scopedCronJobs,
          sessions: scopedSessions
        }}
      />
      <OverviewSurfaces overview={overview.data.data} />
      <OverviewConfiguration overview={overview.data.data} />
      <AgentList agents={visibleAgents} />
    </div>
  );
};
