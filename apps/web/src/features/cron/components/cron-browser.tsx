import type { QueryKey } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { CronCalendar } from '@/features/cron/components/cron-calendar';
import { CronIndex } from '@/features/cron/components/cron-index';
import { CronSummaryGrid } from '@/features/cron/components/cron-summary-grid';
import { getCronJobDisplayState } from '@/features/cron/lib/cron-job-presentation';
import { filterByProfileScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import type { HermesCronJobSummary } from '@hermes-console/runtime';

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function createOptions(values: string[], allLabel: string) {
  return [{ value: 'all', label: allLabel }, ...values.map((value) => ({ value, label: value }))];
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function filterJobs({ jobs, query, status }: { jobs: HermesCronJobSummary[]; query: string; status: string }) {
  const normalizedQuery = query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (status !== 'all' && getCronJobDisplayState(job) !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      job.name,
      job.scheduleDisplay,
      job.scheduleExpression,
      job.deliver,
      job.originChatName,
      job.id,
      job.model,
      job.provider,
      job.pausedReason
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function CronBrowser({
  jobs,
  loadedAt,
  profileScope,
  refreshQueryKeys
}: {
  jobs: HermesCronJobSummary[];
  loadedAt: string;
  profileScope: ProfileScopeId;
  refreshQueryKeys: QueryKey[];
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const deferredQuery = useDeferredValue(query);
  const scopedJobs = useMemo(
    () =>
      filterByProfileScope({
        items: jobs,
        scope: profileScope
      }),
    [jobs, profileScope]
  );

  const filteredJobs = useMemo(
    () => filterJobs({ jobs: scopedJobs, query: deferredQuery, status }),
    [scopedJobs, deferredQuery, status]
  );

  const statusOptions = createOptions(uniqueValues(scopedJobs.map((job) => getCronJobDisplayState(job))), 'All states');
  const hasActiveFilters = query.trim().length > 0 || status !== 'all';
  const pausedJobCount = filteredJobs.filter(
    (job) => getCronJobDisplayState(job) === 'paused' || getCronJobDisplayState(job) === 'disabled'
  ).length;
  const activeJobCount = filteredJobs.length - pausedJobCount;

  const summaryItems = [
    {
      label: 'active jobs',
      value: formatCount(activeJobCount),
      detail:
        filteredJobs.length === scopedJobs.length
          ? 'Jobs that are currently schedulable.'
          : `Filtered from ${formatCount(scopedJobs.length)} scoped jobs.`,
      tone: 'default' as const
    },
    {
      label: 'paused jobs',
      value: formatCount(pausedJobCount),
      detail: 'Paused or disabled jobs in the current view.',
      tone: 'muted' as const
    },
    {
      label: 'recent failures',
      value: formatCount(filteredJobs.filter((job) => job.recentFailureCount > 0).length),
      detail: 'Jobs with at least one recent observed failure.',
      tone: 'default' as const
    },
    {
      label: 'upcoming runs',
      value: formatCount(filteredJobs.reduce((sum, job) => sum + job.upcomingRuns.length, 0)),
      detail: 'Occurrences visible in the next 7 days.',
      tone: 'default' as const
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Cron</p>
          <RefreshButton loadedAt={loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          Scheduled Jobs
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-fg-muted">
          Scheduled jobs across agents, with clearer execution health, upcoming runs, and saved output state.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search jobs, schedules, delivery targets, providers, and job ids"
            className="min-w-[18rem] flex-[2.2_1_28rem]"
          />
          <AppSelect
            value={status}
            onChange={setStatus}
            options={statusOptions}
            ariaLabel="Filter cron jobs by state"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          <div className="inline-flex overflow-hidden rounded-xl border border-border/70 bg-bg/35">
            {[
              { value: 'list', label: 'List' },
              { value: 'calendar', label: 'Calendar' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value as 'list' | 'calendar')}
                className={[
                  'px-3 py-2.5 text-sm transition-colors',
                  view === option.value ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:text-fg'
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatus('all');
              }}
              className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <CronSummaryGrid items={summaryItems} />
      {filteredJobs.length === 0 ? (
        <EmptyState
          eyebrow="No matches"
          title="No cron jobs matched these filters"
          description="Try a different profile scope, search, or job state."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                }}
                className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : view === 'calendar' ? (
        <CronCalendar jobs={filteredJobs} />
      ) : (
        <CronIndex jobs={filteredJobs} />
      )}
    </div>
  );
}
