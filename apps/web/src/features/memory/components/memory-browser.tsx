import type { QueryKey } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { MemoryFilePanel } from '@/features/memory/components/memory-file-panel';
import { MemoryPressureBadge } from '@/features/memory/components/memory-pressure-badge';
import { MemoryProviderBadge, MemoryStatusBadge } from '@/features/memory/components/memory-status-badge';
import { MemorySummaryGrid } from '@/features/memory/components/memory-summary-grid';
import { filterByProfileScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import type {
  AgentMemoryReadResult,
  HermesMemoryIndex,
  MemoryFileSummary,
  MemoryStatusLevel
} from '@hermes-console/runtime';

function getOverallPressureLevel(agent: AgentMemoryReadResult) {
  if (agent.files.memory.pressureLevel === 'at_limit' || agent.files.user.pressureLevel === 'at_limit') {
    return 'at_limit';
  }

  if (agent.files.memory.pressureLevel === 'near_limit' || agent.files.user.pressureLevel === 'near_limit') {
    return 'near_limit';
  }

  if (
    agent.files.memory.pressureLevel === 'approaching_limit' ||
    agent.files.user.pressureLevel === 'approaching_limit'
  ) {
    return 'approaching_limit';
  }

  return 'healthy';
}

function filterMemoryFile(file: MemoryFileSummary, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return {
      hasMatch: true,
      matchedByRawContent: false,
      visibleEntries: file.entries
    };
  }

  if (!file.exists) {
    return {
      hasMatch: false,
      matchedByRawContent: false,
      visibleEntries: []
    };
  }

  const matchedByRawContent = file.rawContent.toLowerCase().includes(normalizedQuery);
  const visibleEntries = matchedByRawContent
    ? file.entries
    : file.entries.filter((entry) => entry.content.toLowerCase().includes(normalizedQuery));

  return {
    hasMatch: matchedByRawContent || visibleEntries.length > 0,
    matchedByRawContent,
    visibleEntries
  };
}

function formatModifiedTime(value: number | null) {
  return value == null ? 'not observed' : new Date(value).toLocaleString();
}

function getOverallStatusLevel(agents: AgentMemoryReadResult[]): MemoryStatusLevel {
  const rank: Record<MemoryStatusLevel, number> = {
    healthy: 0,
    stale: 1,
    pressured: 2,
    missing: 3,
    unknown: 4
  };

  return (
    agents.map((agent) => agent.statusSummary.level).sort((left, right) => rank[right] - rank[left])[0] ?? 'unknown'
  );
}

export function MemoryBrowser({
  loadedAt,
  memory,
  profileScope,
  refreshQueryKeys
}: {
  loadedAt: string | null | undefined;
  memory: HermesMemoryIndex;
  profileScope: ProfileScopeId;
  refreshQueryKeys: QueryKey[];
}) {
  const [query, setQuery] = useState('');
  const visibleAgents = useMemo(
    () =>
      filterByProfileScope({
        items: memory.agents,
        scope: profileScope
      }),
    [memory.agents, profileScope]
  );
  const fileFiltersByAgent = useMemo(
    () =>
      visibleAgents.map((agent) => ({
        agent,
        memory: filterMemoryFile(agent.files.memory, query),
        user: filterMemoryFile(agent.files.user, query)
      })),
    [query, visibleAgents]
  );

  if (visibleAgents.length === 0) {
    return (
      <EmptyState
        eyebrow="Unavailable"
        title="No memory profiles were discovered"
        description="Hermes Console did not find any profile roots to inspect for memory files."
        tone="danger"
      />
    );
  }

  const pressureRank = {
    healthy: 0,
    approaching_limit: 1,
    near_limit: 2,
    at_limit: 3
  };
  const overallPressure =
    visibleAgents.map(getOverallPressureLevel).sort((left, right) => pressureRank[right] - pressureRank[left])[0] ??
    'healthy';
  const overallStatus = getOverallStatusLevel(visibleAgents);
  const hasSearchMatches = fileFiltersByAgent.some((filters) => filters.memory.hasMatch || filters.user.hasMatch);
  const visibleMemoryEntries = fileFiltersByAgent.reduce(
    (sum, filters) => sum + filters.memory.visibleEntries.length + filters.user.visibleEntries.length,
    0
  );
  const totalMemoryEntries = visibleAgents.reduce(
    (sum, agent) => sum + agent.files.memory.entries.length + agent.files.user.entries.length,
    0
  );
  const hasActiveFilters = query.trim().length > 0;
  const summaryItems = [
    {
      label: 'profiles',
      value: String(visibleAgents.length),
      detail: 'Profiles visible in the active scope.',
      tone: 'default' as const
    },
    {
      label: 'healthy',
      value: String(visibleAgents.filter((agent) => agent.statusSummary.level === 'healthy').length),
      detail: 'Profiles with present, current, low-pressure memory.',
      tone: 'default' as const
    },
    {
      label: 'provider-backed',
      value: String(visibleAgents.filter((agent) => agent.provider.kind === 'external').length),
      detail: 'Profiles configured with an external memory provider alongside built-in files.',
      tone: 'default' as const
    },
    {
      label: 'saved blocks',
      value: String(visibleMemoryEntries),
      detail: query
        ? 'Blocks matching the current search across visible profiles.'
        : `${totalMemoryEntries} memory and user entries in scope.`,
      tone: 'default' as const
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Memory</p>
          <MemoryStatusBadge level={overallStatus} />
          <MemoryPressureBadge level={overallPressure} />
          <RefreshButton loadedAt={loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Saved Memory
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
          Hermes stores built-in durable memory in local, private markdown files. External providers can add recall
          alongside those files; this page only shows local status and bounded raw file previews.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search memory blocks and raw file contents"
            className="min-w-[18rem] flex-[2.3_1_28rem]"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
              }}
              className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <MemorySummaryGrid items={summaryItems} />

      {!hasSearchMatches && query.trim().length > 0 ? (
        <EmptyState
          eyebrow="No matches"
          title="This agent had no memory matches"
          description="Try a different search term or clear the search to restore the full memory view."
          action={
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
            >
              Clear search
            </button>
          }
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {fileFiltersByAgent.map((filters) => (
          <section key={filters.agent.agentId} className="space-y-4 xl:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                {filters.agent.agentLabel}
              </h3>
              <MemoryStatusBadge level={filters.agent.statusSummary.level} />
              <MemoryProviderBadge status={filters.agent.provider.status} />
              <MemoryPressureBadge level={getOverallPressureLevel(filters.agent)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-surface/60 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">status</p>
                <p className="mt-2 text-sm text-fg-strong">{filters.agent.statusSummary.label}</p>
                <p className="mt-2 text-sm leading-6 text-fg-muted">{filters.agent.statusSummary.detail}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface/60 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">provider</p>
                <p className="mt-2 text-sm text-fg-strong">{filters.agent.provider.name}</p>
                <p className="mt-2 text-sm leading-6 text-fg-muted">
                  {filters.agent.provider.description ?? 'Provider details are unknown from local metadata.'}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface/60 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">last modified</p>
                <p className="mt-2 text-sm text-fg-strong">
                  {formatModifiedTime(filters.agent.statusSummary.latestModifiedMs)}
                </p>
                <p className="mt-2 text-sm leading-6 text-fg-muted">
                  Stale after {filters.agent.statusSummary.staleAfterDays} days without a built-in memory file change.
                </p>
              </div>
            </div>
            {filters.agent.provider.requirements.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filters.agent.provider.requirements.map((requirement) => (
                  <span
                    key={requirement.envVar}
                    className="rounded-full border border-border/80 bg-bg/40 px-2.5 py-1 font-mono text-[11px] text-fg-muted"
                  >
                    {requirement.envVar}: {requirement.status}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="grid gap-6 xl:grid-cols-2">
              <MemoryFilePanel
                file={filters.agent.files.memory}
                limitSource={filters.agent.limits.memory.source}
                matchedByRawContent={filters.memory.matchedByRawContent}
                searchQuery={query}
                visibleEntries={filters.memory.visibleEntries}
              />
              <MemoryFilePanel
                file={filters.agent.files.user}
                limitSource={filters.agent.limits.user.source}
                matchedByRawContent={filters.user.matchedByRawContent}
                searchQuery={query}
                visibleEntries={filters.user.visibleEntries}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
