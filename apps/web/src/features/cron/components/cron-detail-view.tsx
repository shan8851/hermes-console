import type { ReactNode } from 'react';

import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { CopyButton } from '@/components/ui/copy-button';
import { CronDependencyList } from '@/features/cron/components/cron-dependency-list';
import { getCronJobStateBadge, getCronOutputBadge } from '@/features/cron/lib/cron-job-presentation';
import type { HermesCronJobDetail, HermesCronJobSummary } from '@hermes-console/runtime';

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function formatDuration(value: number | null): string {
  if (value == null) {
    return '—';
  }

  if (value < 1_000) {
    return `${value} ms`;
  }

  return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)} s`;
}

function formatSuccessRate(value: number | null): string {
  if (value == null) {
    return '—';
  }

  return `${Math.round(value * 100)}%`;
}

function formatRecentHealth(job: HermesCronJobSummary): string {
  if (job.recentObservedRunCount === 0) {
    return 'No observed runs yet';
  }

  return `${job.recentSuccessCount}/${job.recentObservedRunCount} succeeded`;
}

function outputBadgeClass(state: HermesCronJobSummary['latestOutputState']): string {
  if (state === 'contentful') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  }

  if (state === 'silent') {
    return 'border-border/80 bg-bg/40 text-fg-muted';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

function MetadataBlock({ label, value, action }: { label: string; value: string; action?: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="break-all text-sm leading-6 text-fg">{value}</p>
        {action}
      </div>
    </div>
  );
}

function DetailChip({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={['rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]', className].join(
        ' '
      )}
    >
      {label}
    </span>
  );
}

function UpcomingRunsSection({ detail }: { detail: HermesCronJobDetail }) {
  if (detail.upcomingRuns.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
        No upcoming runs were derived for the next 7 days.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {detail.upcomingRuns.map((run) => (
        <div
          key={run.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-bg/40 px-3 py-2"
        >
          <span className="font-mono text-xs text-fg-faint">{run.id}</span>
          <span className="text-sm text-fg">{formatTimestamp(run.scheduledAt)}</span>
        </div>
      ))}
    </div>
  );
}

function ObservedRunsSection({ detail }: { detail: HermesCronJobDetail }) {
  if (detail.observedRuns.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
        No observed runs were found in the Hermes state database for this job.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-fg-faint">
            <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">status</th>
            <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">started</th>
            <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">ended</th>
            <th className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]">duration</th>
          </tr>
        </thead>
        <tbody>
          {detail.observedRuns.map((run) => (
            <tr key={run.id} className="rounded-md border border-border/70 bg-bg/40 text-fg-muted">
              <td className="rounded-l-md px-3 py-3">
                <span
                  className={[
                    'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
                    run.success
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/30 bg-red-500/10 text-red-200'
                  ].join(' ')}
                >
                  {run.success ? 'success' : 'failure'}
                </span>
              </td>
              <td className="px-3 py-3">{formatTimestamp(run.startedAt)}</td>
              <td className="px-3 py-3">{formatTimestamp(run.endedAt)}</td>
              <td className="rounded-r-md px-3 py-3">{formatDuration(run.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutputsSection({ detail }: { detail: HermesCronJobDetail }) {
  if (!detail.hasOutputs) {
    return (
      <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
        No saved outputs were recorded for this job.
      </div>
    );
  }

  return (
    <div className="space-y-3 xl:max-h-[56rem] xl:overflow-auto xl:pr-1">
      {detail.outputs.map((output) => (
        <article key={output.id} className="rounded-md border border-border/70 bg-bg/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  'rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]',
                  outputBadgeClass(output.responseState)
                ].join(' ')}
              >
                {output.responseState}
              </span>
              <span className="font-mono text-xs text-fg-muted">{output.fileName}</span>
            </div>
            <p className="text-xs text-fg-muted">{formatTimestamp(output.createdAt)}</p>
          </div>
          <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg">{output.responsePreview}</pre>
        </article>
      ))}
    </div>
  );
}

export function CronDetailView({
  detail,
  jobs,
  loadedAt
}: {
  detail: HermesCronJobDetail;
  jobs: HermesCronJobSummary[];
  loadedAt: string;
}) {
  const { job } = detail;
  const stateBadge = getCronJobStateBadge({ job, now: loadedAt });
  const outputBadge = getCronOutputBadge(job);
  const repeatProgress =
    job.repeatCompleted == null
      ? null
      : job.repeatTimes == null
        ? `${job.repeatCompleted} completed`
        : `${job.repeatCompleted}/${job.repeatTimes} completed`;

  return (
    <div className="space-y-8">
      <section className="max-w-5xl space-y-4">
        <AppBreadcrumbs items={[{ label: 'Cron', to: '/cron' }, { label: job.name }]} />
        <div className="flex flex-wrap items-center gap-3">
          <DetailChip className="border-accent/30 bg-accent/10 text-accent" label={job.agentLabel} />
          {stateBadge ? <DetailChip className={stateBadge.className} label={stateBadge.label} /> : null}
          {outputBadge ? <DetailChip className={outputBadge.className} label={outputBadge.label} /> : null}
        </div>
        <h2 className="font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          {job.name}
        </h2>
        <p className="text-sm leading-7 text-fg-muted">
          Delivery target {job.deliver ?? 'unknown'} · schedule {job.scheduleDisplay}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'next run',
            value: formatTimestamp(job.nextRunAt),
            detail: `last ${formatTimestamp(job.lastRunAt)}`
          },
          {
            label: 'recent health',
            value: formatRecentHealth(job),
            detail: `success rate ${formatSuccessRate(job.recentSuccessRate)}`
          },
          {
            label: 'saved outputs',
            value: String(detail.recentOutputCount),
            detail: `Latest: ${detail.latestOutputState}`
          },
          {
            label: 'created',
            value: formatTimestamp(job.createdAt),
            detail: repeatProgress ?? job.originChatName ?? 'No origin context'
          }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <CronDependencyList currentJob={job} jobs={jobs} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
            Job metadata
          </h3>
          <div className="mt-4 space-y-3 text-sm text-fg-muted">
            <MetadataBlock
              label="job id"
              value={job.jobId}
              action={<CopyButton ariaLabel="Copy cron job id" value={job.jobId} />}
            />
            <MetadataBlock label="delivery" value={job.deliver ?? '—'} />
            <MetadataBlock label="schedule" value={job.scheduleDisplay} />
            {job.scheduleExpression ? <MetadataBlock label="expression" value={job.scheduleExpression} /> : null}
            {job.scriptPath ? <MetadataBlock label="playbook" value={job.scriptPath} /> : null}
            <MetadataBlock label="execution mode" value={job.noAgent ? 'script-only / no agent' : 'agent'} />
            {job.workdir ? <MetadataBlock label="workdir" value={job.workdir} /> : null}
            {job.enabledToolsets.length > 0 ? (
              <MetadataBlock label="enabled toolsets" value={job.enabledToolsets.join(', ')} />
            ) : null}
            {job.contextFrom.length > 0 ? (
              <MetadataBlock label="context from" value={job.contextFrom.join(', ')} />
            ) : null}
            {job.model ? <MetadataBlock label="model" value={job.model} /> : null}
            {job.provider ? <MetadataBlock label="provider" value={job.provider} /> : null}
            {job.baseUrl ? <MetadataBlock label="base url" value={job.baseUrl} /> : null}
            {job.skill ? <MetadataBlock label="primary skill" value={job.skill} /> : null}
            {job.skills.length > 0 ? <MetadataBlock label="loaded skills" value={job.skills.join(', ')} /> : null}
            {job.pausedReason ? <MetadataBlock label="paused reason" value={job.pausedReason} /> : null}
            {job.pausedAt ? <MetadataBlock label="paused at" value={formatTimestamp(job.pausedAt)} /> : null}
            {job.lastError ? <MetadataBlock label="last error" value={job.lastError} /> : null}
            {job.lastDeliveryError ? <MetadataBlock label="last delivery error" value={job.lastDeliveryError} /> : null}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">prompt</p>
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-border/70 bg-bg/40 p-3 text-xs leading-6 text-fg">
                {job.prompt}
              </pre>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                Run health
              </h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                Observed execution health is separated from saved output files so recurring failures are obvious.
              </p>
            </div>
            <p className="text-xs text-fg-muted">{job.observedRunCount} observed runs</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'recent failures',
                value: `${job.recentFailureCount}/${job.recentObservedRunCount || 0}`,
                detail: 'Failures across the recent observed run window.'
              },
              {
                label: 'failure streak',
                value: String(job.failureStreak),
                detail:
                  job.failureStreak > 0
                    ? 'Consecutive failed runs from the latest observation.'
                    : 'No active failure streak.'
              },
              {
                label: 'last success',
                value: formatTimestamp(job.lastSuccessfulRunAt),
                detail: 'Most recent successful observed run.'
              },
              {
                label: 'last failure',
                value: formatTimestamp(job.lastFailedRunAt),
                detail: 'Most recent failed observed run.'
              },
              {
                label: 'last duration',
                value: formatDuration(job.latestDurationMs),
                detail: 'Duration of the latest observed run.'
              },
              {
                label: 'average duration',
                value: formatDuration(job.averageDurationMs),
                detail: 'Average duration across observed runs.'
              }
            ].map((item) => (
              <article key={item.label} className="rounded-md border border-border/70 bg-bg/40 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">{item.label}</p>
                <p className="mt-2 font-[family-name:var(--font-bricolage)] text-lg font-semibold text-fg-strong">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-3">
              <p className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                Upcoming runs
              </p>
              <p className="mt-2 text-sm leading-6 text-fg-muted">Server-derived occurrences for the next 7 days.</p>
            </div>
            <UpcomingRunsSection detail={detail} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                Recent observed runs
              </h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                Execution history recorded in Hermes state, independent of saved output markdown files.
              </p>
            </div>
            <p className="text-xs text-fg-muted">{detail.observedRuns.length} runs shown</p>
          </div>
          <ObservedRunsSection detail={detail} />
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
                Recent outputs
              </h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                Saved response files for this job. Output presence is useful, but it is not the same as execution
                success.
              </p>
            </div>
            <p className="text-xs text-fg-muted">{detail.recentOutputCount} files</p>
          </div>
          <OutputsSection detail={detail} />
        </section>
      </div>
    </div>
  );
}
