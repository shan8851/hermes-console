import type { QueryKey } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { MemoryFilePanel } from '@/features/memory/components/memory-file-panel';
import { MemoryPressureBadge } from '@/features/memory/components/memory-pressure-badge';
import { MemorySummaryGrid } from '@/features/memory/components/memory-summary-grid';
import type { AgentMemoryReadResult, HermesMemoryIndex, MemoryFileSummary } from '@hermes-console/runtime';

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

function createAgentOptions(memory: HermesMemoryIndex) {
  return memory.agents.map((agent) => ({
    value: agent.agentId,
    label: agent.agentLabel
  }));
}

export function MemoryBrowser({
  loadedAt,
  memory,
  refreshQueryKeys
}: {
  loadedAt: string | null | undefined;
  memory: HermesMemoryIndex;
  refreshQueryKeys: QueryKey[];
}) {
  const [agentId, setAgentId] = useState(memory.agents[0]?.agentId ?? 'default');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (memory.agents.some((agent) => agent.agentId === agentId)) {
      return;
    }

    setAgentId(memory.agents[0]?.agentId ?? 'default');
  }, [agentId, memory.agents]);

  const selectedAgent = memory.agents.find((agent) => agent.agentId === agentId) ?? memory.agents[0] ?? null;

  const fileFilters = useMemo(() => {
    if (!selectedAgent) {
      return null;
    }

    return {
      memory: filterMemoryFile(selectedAgent.files.memory, query),
      user: filterMemoryFile(selectedAgent.files.user, query)
    };
  }, [query, selectedAgent]);

  if (!selectedAgent || !fileFilters) {
    return (
      <EmptyState
        eyebrow="Unavailable"
        title="No memory agents were discovered"
        description="Hermes Console did not find any agent roots to inspect for memory files."
        tone="danger"
      />
    );
  }

  const overallPressure = getOverallPressureLevel(selectedAgent);
  const hasSearchMatches = fileFilters.memory.hasMatch || fileFilters.user.hasMatch;
  const hasActiveFilters = query.trim().length > 0 || agentId !== (memory.agents[0]?.agentId ?? agentId);
  const summaryItems = [
    {
      label: 'status',
      value: selectedAgent.status === 'ready' ? '✓ OK' : selectedAgent.status === 'partial' ? '~ Partial' : 'Missing',
      detail:
        selectedAgent.status === 'ready'
          ? 'Both memory files found for this agent.'
          : selectedAgent.status === 'partial'
            ? 'One memory file found, the other is missing.'
            : 'No memory files found for this agent.',
      tone: 'default' as const
    },
    {
      label: 'memory',
      value: `${selectedAgent.files.memory.usagePercentage}%`,
      detail: `${selectedAgent.files.memory.charCount}/${selectedAgent.files.memory.limit} chars used`,
      tone: 'default' as const
    },
    {
      label: 'user',
      value: `${selectedAgent.files.user.usagePercentage}%`,
      detail: `${selectedAgent.files.user.charCount}/${selectedAgent.files.user.limit} chars used`,
      tone: 'default' as const
    },
    {
      label: 'saved blocks',
      value: String(fileFilters.memory.visibleEntries.length + fileFilters.user.visibleEntries.length),
      detail: query
        ? `${fileFilters.memory.visibleEntries.length} memory + ${fileFilters.user.visibleEntries.length} user blocks visible`
        : `${selectedAgent.files.memory.entries.length} memory + ${selectedAgent.files.user.entries.length} user entries`,
      tone: 'default' as const
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Memory</p>
          <MemoryPressureBadge level={overallPressure} />
          <RefreshButton loadedAt={loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Saved Memory
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
          Hermes stores durable memory in plain markdown files. This page now shows the default agent and any profile
          agents side by side through a single agent picker.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <AppSelect
            value={agentId}
            onChange={setAgentId}
            options={createAgentOptions(memory)}
            ariaLabel="Select memory agent"
            className="min-w-[11rem] flex-[0_1_12rem]"
          />
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
                setAgentId(memory.agents[0]?.agentId ?? agentId);
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
        <MemoryFilePanel
          file={selectedAgent.files.memory}
          limitSource={selectedAgent.limits.memory.source}
          matchedByRawContent={fileFilters.memory.matchedByRawContent}
          searchQuery={query}
          visibleEntries={fileFilters.memory.visibleEntries}
        />
        <MemoryFilePanel
          file={selectedAgent.files.user}
          limitSource={selectedAgent.limits.user.source}
          matchedByRawContent={fileFilters.user.matchedByRawContent}
          searchQuery={query}
          visibleEntries={fileFilters.user.visibleEntries}
        />
      </div>
    </div>
  );
}
