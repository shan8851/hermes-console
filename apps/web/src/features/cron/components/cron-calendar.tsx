import { Link } from '@tanstack/react-router';

import { EmptyState } from '@/components/ui/empty-state';
import type { HermesCronJobSummary } from '@hermes-console/runtime';

type CalendarOccurrence = {
  job: HermesCronJobSummary;
  scheduledAt: Date;
};

type DayColumn = {
  date: Date;
  label: string;
  occurrenceCount: number;
  occurrences: CalendarOccurrence[];
};

const DAYS_TO_SHOW = 7;

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDayLabel(date: Date): string {
  return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${date.getDate()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function buildDayColumns(jobs: HermesCronJobSummary[]): DayColumn[] {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const occurrences = jobs
    .flatMap((job) =>
      job.upcomingRuns.map((run) => ({
        job,
        scheduledAt: new Date(run.scheduledAt)
      }))
    )
    .filter((occurrence) => !Number.isNaN(occurrence.scheduledAt.getTime()))
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

  return Array.from({ length: DAYS_TO_SHOW }).map((_, index) => {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() + index);

    const dayOccurrences = occurrences.filter((occurrence) => isSameDay(occurrence.scheduledAt, date));

    return {
      date,
      label: formatDayLabel(date),
      occurrenceCount: dayOccurrences.length,
      occurrences: dayOccurrences
    } satisfies DayColumn;
  });
}

function CalendarOccurrenceRow({ occurrence }: { occurrence: CalendarOccurrence }) {
  return (
    <Link
      params={{
        agentId: occurrence.job.agentId,
        jobId: occurrence.job.jobId
      }}
      to="/cron/$agentId/$jobId"
      className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-2 border-b border-border/40 px-2.5 py-2 transition-colors hover:bg-accent/5 last:border-b-0"
    >
      <span className="font-mono text-[10px] leading-5 text-fg-faint">{formatTime(occurrence.scheduledAt)}</span>
      <div className="min-w-0">
        <p className="text-xs leading-5 text-fg-strong">{occurrence.job.name}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-fg-muted">{occurrence.job.agentLabel}</p>
      </div>
    </Link>
  );
}

export function CronCalendar({ jobs }: { jobs: HermesCronJobSummary[] }) {
  const columns = buildDayColumns(jobs);
  const totalOccurrences = columns.reduce((sum, column) => sum + column.occurrenceCount, 0);

  if (totalOccurrences === 0) {
    return (
      <EmptyState
        eyebrow="No runs"
        title="No upcoming runs in the next 7 days"
        description="The current filters may exclude enabled jobs, or the selected jobs do not have upcoming runs in the visible window."
      />
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
          Scheduled calendar
        </h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">
          The next 7 days of cron activity, with every scheduled occurrence rendered in its day column.
        </p>
      </div>

      <div className="hidden overflow-x-auto pb-1 lg:block">
        <div className="grid min-w-[112rem] gap-3 lg:grid-cols-7">
          {columns.map((column) => {
            const isToday = isSameDay(column.date, new Date());

            return (
              <div
                key={column.date.toISOString()}
                className={[
                  'flex min-h-[44rem] flex-col overflow-hidden rounded-lg border',
                  isToday ? 'border-accent/35 bg-accent/6' : 'border-border/70 bg-bg/30'
                ].join(' ')}
              >
                <div className="border-b border-border/50 px-3 py-3">
                  <p
                    className={['text-center text-xs font-medium', isToday ? 'text-accent' : 'text-fg-muted'].join(' ')}
                  >
                    {column.label}
                  </p>
                  <p className="mt-1 text-center font-mono text-[10px] text-fg-faint">
                    {column.occurrenceCount} occurrence{column.occurrenceCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex-1 overflow-auto">
                  {column.occurrences.length === 0 ? (
                    <p className="px-3 py-8 text-center text-[11px] text-fg-faint">No runs</p>
                  ) : (
                    column.occurrences.map((occurrence) => (
                      <CalendarOccurrenceRow
                        key={`${occurrence.job.summaryId}:${occurrence.scheduledAt.toISOString()}`}
                        occurrence={occurrence}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {columns.map((column) => (
          <div key={column.date.toISOString()} className="overflow-hidden rounded-lg border border-border/70 bg-bg/30">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-3">
              <p className="text-sm font-medium text-fg-strong">{column.label}</p>
              <p className="font-mono text-[10px] text-fg-faint">
                {column.occurrenceCount} occurrence{column.occurrenceCount === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              {column.occurrences.length === 0 ? (
                <p className="px-3 py-4 text-xs text-fg-faint">No runs</p>
              ) : (
                column.occurrences.map((occurrence) => (
                  <CalendarOccurrenceRow
                    key={`${occurrence.job.summaryId}:${occurrence.scheduledAt.toISOString()}`}
                    occurrence={occurrence}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
