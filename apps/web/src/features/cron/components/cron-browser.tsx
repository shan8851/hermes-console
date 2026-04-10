import type { QueryKey } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';

import { AppSelect } from '@/components/ui/app-select';
import { EmptyState } from '@/components/ui/empty-state';
import { RefreshButton } from '@/components/ui/refresh-button';
import { SearchInput } from '@/components/ui/search-input';
import { CronIndex } from '@/features/cron/components/cron-index';
import { CronSummaryGrid } from '@/features/cron/components/cron-summary-grid';
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

function filterJobs({
  jobs,
  query,
  agent,
  status
}: {
  jobs: HermesCronJobSummary[];
  query: string;
  agent: string;
  status: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (agent !== 'all' && job.agentId !== agent) {
      return false;
    }

    if (status !== 'all' && (job.lastStatus ?? job.state ?? 'unknown') !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [job.name, job.scheduleDisplay, job.deliver, job.originChatName, job.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function CronBrowser({
  jobs,
  loadedAt,
  refreshQueryKeys
}: {
  jobs: HermesCronJobSummary[];
  loadedAt: string;
  refreshQueryKeys: QueryKey[];
}) {
  const [query, setQuery] = useState('');
  const [agent, setAgent] = useState('all');
  const [status, setStatus] = useState('all');
  const deferredQuery = useDeferredValue(query);

  const filteredJobs = useMemo(
    () => filterJobs({ jobs, query: deferredQuery, agent, status }),
    [jobs, deferredQuery, agent, status]
  );

  const agentOptions = createOptions(uniqueValues(jobs.map((job) => job.agentId)), 'All agents');
  const statusOptions = createOptions(
    uniqueValues(jobs.map((job) => job.lastStatus ?? job.state ?? 'unknown')),
    'All states'
  );
  const hasActiveFilters = query.trim().length > 0 || agent !== 'all' || status !== 'all';

  const summaryItems = [
    {
      label: 'visible jobs',
      value: formatCount(filteredJobs.length),
      detail:
        filteredJobs.length === jobs.length
          ? 'All detected cron jobs across agents.'
          : `Filtered from ${formatCount(jobs.length)} total jobs.`,
      tone: 'default' as const
    },
    {
      label: 'needs attention',
      value: formatCount(
        filteredJobs.filter((job) => job.attentionLevel === 'warning' || job.attentionLevel === 'critical').length
      ),
      detail: 'Jobs that are overdue, flaky, or currently failing.',
      tone: 'muted' as const
    },
    {
      label: 'overdue',
      value: formatCount(filteredJobs.filter((job) => job.overdue).length),
      detail: 'Enabled jobs whose next run time is more than 30 minutes late.',
      tone: 'default' as const
    },
    {
      label: 'failure streaks',
      value: formatCount(filteredJobs.filter((job) => job.failureStreak > 0).length),
      detail: 'Jobs with one or more consecutive failed observed runs.',
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
          Scheduled jobs across agents, with run state and recent output.
        </p>
        <div className="mt-4 flex flex-wrap items-stretch gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search jobs, schedules, delivery targets, and job ids"
            className="min-w-[18rem] flex-[2.2_1_28rem]"
          />
          <AppSelect
            value={agent}
            onChange={setAgent}
            options={agentOptions}
            ariaLabel="Filter cron jobs by agent"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          <AppSelect
            value={status}
            onChange={setStatus}
            options={statusOptions}
            ariaLabel="Filter cron jobs by state"
            className="min-w-[11.5rem] flex-[0_1_12rem]"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setAgent('all');
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
          description="Try a different search, agent, or job state."
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setAgent('all');
                  setStatus('all');
                }}
                className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
              >
                Reset filters
              </button>
            ) : null
          }
        />
      ) : (
        <CronIndex jobs={filteredJobs} />
      )}
    </div>
  );
}
