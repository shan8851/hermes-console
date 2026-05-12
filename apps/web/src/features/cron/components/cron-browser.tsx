import type { QueryKey } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useDeferredValue, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { CronCalendar } from '@/features/cron/components/cron-calendar';
import { CronIndex } from '@/features/cron/components/cron-index';
import { CronSummaryGrid } from '@/features/cron/components/cron-summary-grid';
import {
  clearCronFilters,
  CRON_HEALTH_LABELS,
  CRON_SORT_LABELS,
  filterCronJobs,
  hasActiveCronFilters,
  readCronJobHealth,
  type CronFilterSearch
} from '@/features/cron/lib/cron-filters';
import { filterByProfileScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import type { CronHealthState, HermesCronJobSummary } from '@hermes-console/runtime';

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

const cronHealthOptions = [
  { value: 'all', label: 'All health states' },
  ...Object.entries(CRON_HEALTH_LABELS).map(([value, label]) => ({ value, label }))
];

const cronSortOptions = Object.entries(CRON_SORT_LABELS).map(([value, label]) => ({ value, label }));

const enabledOptions = [
  { value: 'all', label: 'Enabled and disabled' },
  { value: 'enabled', label: 'Enabled only' },
  { value: 'disabled', label: 'Disabled only' }
];

const attentionHealthStates = new Set<CronHealthState>(['delivery-failed', 'failed-last-run', 'overdue']);

const filterToggles = [
  { key: 'script', value: 'only', label: 'Script-only' },
  { key: 'mode', value: 'no-agent', label: 'No agent' },
  { key: 'context', value: 'from', label: 'Has context' },
  { key: 'workdir', value: 'present', label: 'Has workdir' }
] as const;

export function CronBrowser({
  cronSearch,
  jobs,
  loadedAt,
  profileScope,
  refreshQueryKeys
}: {
  cronSearch: CronFilterSearch;
  jobs: HermesCronJobSummary[];
  loadedAt: string;
  profileScope: ProfileScopeId;
  refreshQueryKeys: QueryKey[];
}) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const query = cronSearch.q ?? '';
  const deferredQuery = useDeferredValue(query);
  const scopedJobs = useMemo(
    () =>
      filterByProfileScope({
        items: jobs,
        scope: profileScope
      }),
    [jobs, profileScope]
  );

  const deferredCronSearch = useMemo(
    () => ({
      ...cronSearch,
      q: deferredQuery.trim().length > 0 ? deferredQuery : undefined
    }),
    [cronSearch, deferredQuery]
  );
  const filteredJobs = useMemo(
    () =>
      filterCronJobs({
        jobs: scopedJobs,
        now: loadedAt,
        search: deferredCronSearch
      }),
    [deferredCronSearch, loadedAt, scopedJobs]
  );

  const updateCronSearch = (nextSearch: CronFilterSearch) => {
    void router.navigate({
      replace: true,
      search: nextSearch,
      to: '/cron'
    });
  };
  const activeFilterCount = hasActiveCronFilters(cronSearch);
  const pausedJobCount = filteredJobs.filter((job) =>
    ['paused', 'disabled'].includes(readCronJobHealth({ job, now: loadedAt }))
  ).length;
  const activeJobCount = filteredJobs.length - pausedJobCount;
  const attentionJobCount = filteredJobs.filter((job) =>
    attentionHealthStates.has(readCronJobHealth({ job, now: loadedAt }))
  ).length;

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
      label: 'needs attention',
      value: formatCount(attentionJobCount),
      detail: 'Failed, delivery-failed, or overdue jobs in the current view.',
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
            onChange={(value) =>
              updateCronSearch({
                ...cronSearch,
                q: value.trim().length > 0 ? value : undefined
              })
            }
            placeholder="Search jobs, schedules, delivery targets, providers, and job ids"
            className="min-w-[18rem] flex-[2.2_1_28rem]"
          />
          <AppSelect
            value={cronSearch.health ?? 'all'}
            onChange={(value) =>
              updateCronSearch({
                ...cronSearch,
                health: value === 'all' ? undefined : (value as CronHealthState)
              })
            }
            options={cronHealthOptions}
            ariaLabel="Filter cron jobs by health"
            className="min-w-[13rem] flex-[0_1_14rem]"
          />
          <AppSelect
            value={cronSearch.enabled ?? 'all'}
            onChange={(value) =>
              updateCronSearch({
                ...cronSearch,
                enabled: value === 'all' ? undefined : (value as 'enabled' | 'disabled')
              })
            }
            options={enabledOptions}
            ariaLabel="Filter cron jobs by enabled state"
            className="min-w-[13rem] flex-[0_1_14rem]"
          />
          <AppSelect
            value={cronSearch.sort ?? 'attention'}
            onChange={(value) =>
              updateCronSearch({
                ...cronSearch,
                sort: value === 'attention' ? undefined : (value as CronFilterSearch['sort'])
              })
            }
            options={cronSortOptions}
            ariaLabel="Sort cron jobs"
            className="min-w-[12rem] flex-[0_1_13rem]"
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
          {activeFilterCount ? (
            <button
              type="button"
              onClick={() => updateCronSearch(clearCronFilters(cronSearch))}
              className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filterToggles.map((toggle) => {
            const isActive = cronSearch[toggle.key] === toggle.value;

            return (
              <button
                key={toggle.key}
                type="button"
                aria-pressed={isActive}
                onClick={() =>
                  updateCronSearch({
                    ...cronSearch,
                    [toggle.key]: isActive ? undefined : toggle.value
                  })
                }
                className={[
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-border/70 bg-bg/35 text-fg-muted hover:border-accent/35 hover:text-fg'
                ].join(' ')}
              >
                {toggle.label}
              </button>
            );
          })}
        </div>
      </section>

      <CronSummaryGrid items={summaryItems} />
      {filteredJobs.length === 0 ? (
        <EmptyState
          eyebrow="No matches"
          title="No cron jobs matched these filters"
          description="Try a different profile scope, search, or job state."
          action={
            activeFilterCount ? (
              <button
                type="button"
                onClick={() => updateCronSearch(clearCronFilters(cronSearch))}
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
        <CronIndex jobs={filteredJobs} loadedAt={loadedAt} />
      )}
    </div>
  );
}
