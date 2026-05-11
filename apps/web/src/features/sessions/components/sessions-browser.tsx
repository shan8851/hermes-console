import type { QueryKey } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { filterByProfileScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import { SessionsIndex } from '@/features/sessions/components/sessions-index';
import { SessionsSummaryGrid } from '@/features/sessions/components/sessions-summary-grid';
import type { HermesSessionSummary } from '@hermes-console/runtime';

function filterSessions({
  sessions,
  query,
  source,
  platform
}: {
  sessions: HermesSessionSummary[];
  query: string;
  source: string;
  platform: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return sessions.filter((session) => {
    if (source !== 'all' && (session.source ?? 'unknown') !== source) {
      return false;
    }

    if (platform !== 'all' && (session.platform ?? 'unknown') !== platform) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      session.title,
      session.displayName,
      session.agentLabel,
      session.source,
      session.platform,
      session.model,
      session.sessionId
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function createOptions(values: string[], allLabel: string) {
  return [{ value: 'all', label: allLabel }, ...values.map((value) => ({ value, label: value }))];
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function SessionsBrowser({
  initialQuery,
  loadedAt,
  profileScope,
  refreshQueryKeys,
  sessions
}: {
  initialQuery: string;
  loadedAt: string;
  profileScope: ProfileScopeId;
  refreshQueryKeys: QueryKey[];
  sessions: HermesSessionSummary[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState('all');
  const [platform, setPlatform] = useState('all');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const scopedSessions = useMemo(
    () =>
      filterByProfileScope({
        items: sessions,
        scope: profileScope
      }),
    [profileScope, sessions]
  );

  const filteredSessions = useMemo(
    () =>
      filterSessions({
        sessions: scopedSessions,
        query: deferredQuery,
        source,
        platform
      }),
    [scopedSessions, deferredQuery, source, platform]
  );

  const sources = uniqueValues(scopedSessions.map((session) => session.source ?? 'unknown'));
  const platforms = uniqueValues(scopedSessions.map((session) => session.platform ?? 'unknown'));
  const sourceOptions = createOptions(sources, 'All sources');
  const platformOptions = createOptions(platforms, 'All platforms');
  const hasActiveFilters = query.trim().length > 0 || source !== 'all' || platform !== 'all';

  const summaryItems = [
    {
      label: 'visible sessions',
      value: formatCount(filteredSessions.length),
      detail:
        filteredSessions.length === scopedSessions.length
          ? 'All sessions in the active profile scope.'
          : `Filtered from ${formatCount(scopedSessions.length)} scoped sessions.`,
      tone: 'default' as const
    },
    {
      label: 'agents',
      value: formatCount(new Set(filteredSessions.map((session) => session.agentId)).size),
      detail: 'Agents represented in the visible sessions.',
      tone: 'default' as const
    },
    {
      label: 'transcript only',
      value: formatCount(
        filteredSessions.filter((session) => session.hasStateTranscript && !session.hasMessagingMetadata).length
      ),
      detail: 'Sessions with transcript data but no messaging context.',
      tone: 'muted' as const
    },
    {
      label: 'messaging only',
      value: formatCount(
        filteredSessions.filter((session) => !session.hasStateTranscript && session.hasMessagingMetadata).length
      ),
      detail: 'Sessions with messaging context but no transcript-backed state.db record.',
      tone: 'muted' as const
    },
    {
      label: 'source types',
      value: formatCount(new Set(filteredSessions.map((session) => session.source ?? 'unknown')).size),
      detail: 'Distinct session sources in the current view.',
      tone: 'default' as const
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Sessions</p>
          <RefreshButton loadedAt={loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Session History
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
          All recorded sessions across agents, with messaging context where available.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search titles, platforms, models, and session ids"
            className="min-w-[18rem] flex-[2.4_1_28rem]"
          />
          <AppSelect
            value={source}
            onChange={setSource}
            options={sourceOptions}
            ariaLabel="Filter sessions by source"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          <AppSelect
            value={platform}
            onChange={setPlatform}
            options={platformOptions}
            ariaLabel="Filter sessions by platform"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSource('all');
                setPlatform('all');
              }}
              className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <SessionsSummaryGrid items={summaryItems} />
      {filteredSessions.length === 0 ? (
        <EmptyState
          eyebrow="No matches"
          title="No sessions matched these filters"
          description="Try a different profile scope, source, platform, or session search."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSource('all');
                  setPlatform('all');
                }}
                className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : (
        <SessionsIndex sessions={filteredSessions} />
      )}
    </div>
  );
}
