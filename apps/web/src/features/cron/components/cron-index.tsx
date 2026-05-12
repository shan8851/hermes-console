import { Link } from '@tanstack/react-router';

import { getCronJobStateBadge, getCronOutputBadge } from '@/features/cron/lib/cron-job-presentation';
import type { HermesCronJobSummary } from '@hermes-console/runtime';

function formatTimestamp(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function formatSuccessRate(value: number | null) {
  if (value == null) {
    return '—';
  }

  return `${Math.round(value * 100)}%`;
}

function recentRunLabel(job: HermesCronJobSummary) {
  if (job.recentObservedRunCount === 0) {
    return 'no observed runs';
  }

  return `${job.recentFailureCount}/${job.recentObservedRunCount} recent failures`;
}

export function CronIndex({ jobs, loadedAt }: { jobs: HermesCronJobSummary[]; loadedAt: string }) {
  if (jobs.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No cron jobs matched the current filters.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4 xl:max-h-[58rem] xl:overflow-auto">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          Scheduled jobs
        </h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">
          Jobs in the current view, with execution health separate from saved output.
        </p>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => {
          const stateBadge = getCronJobStateBadge({ job, now: loadedAt });
          const outputBadge = getCronOutputBadge(job);

          return (
            <Link
              key={job.summaryId}
              params={{
                agentId: job.agentId,
                jobId: job.jobId
              }}
              to="/cron/$agentId/$jobId"
              className="block rounded-md border border-border/70 bg-bg/40 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg-strong">{job.name}</p>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                      {job.agentLabel}
                    </span>
                    {stateBadge ? (
                      <span
                        className={[
                          'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
                          stateBadge.className
                        ].join(' ')}
                      >
                        {stateBadge.label}
                      </span>
                    ) : null}
                    {outputBadge ? (
                      <span
                        className={[
                          'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
                          outputBadge.className
                        ].join(' ')}
                      >
                        {outputBadge.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm leading-6 text-fg-muted">
                    {job.scheduleDisplay} · deliver {job.deliver ?? 'unknown'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-muted">
                    {job.overdue ? <span className="text-amber-200">overdue</span> : null}
                    {job.failureStreak > 0 ? (
                      <span className={job.failureStreak >= 2 ? 'text-red-200' : 'text-amber-200'}>
                        streak {job.failureStreak}
                      </span>
                    ) : null}
                    <span>{recentRunLabel(job)}</span>
                    <span>success rate {formatSuccessRate(job.recentSuccessRate)}</span>
                    {job.lastSuccessfulRunAt ? (
                      <span>last success {formatTimestamp(job.lastSuccessfulRunAt)}</span>
                    ) : null}
                    {job.lastFailedRunAt ? (
                      <span className="text-red-200">last failure {formatTimestamp(job.lastFailedRunAt)}</span>
                    ) : null}
                    {job.latestDurationMs != null ? <span>last {Math.round(job.latestDurationMs / 1000)}s</span> : null}
                    <span>{job.recentOutputCount} outputs</span>
                    {job.repeatCompleted != null ? (
                      <span>
                        {job.repeatCompleted}
                        {job.repeatTimes != null ? `/${job.repeatTimes}` : ''} completed
                      </span>
                    ) : null}
                    {job.model ? <span>{job.model}</span> : null}
                    {job.pausedReason ? <span className="text-amber-200">paused: {job.pausedReason}</span> : null}
                    {job.lastError ? <span className="text-red-200">{job.lastError}</span> : null}
                  </div>
                </div>

                <div className="text-right text-xs text-fg-muted">
                  <p className="font-medium text-fg">next {formatTimestamp(job.nextRunAt)}</p>
                  <p className="mt-1">last {formatTimestamp(job.lastRunAt)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
