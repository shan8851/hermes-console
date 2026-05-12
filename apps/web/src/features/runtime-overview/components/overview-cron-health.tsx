import { Link } from '@tanstack/react-router';

import { createCronHealthSearch, readCronJobHealth, type CronFilterSearch } from '@/features/cron/lib/cron-filters';
import { isAllProfilesScope, type ProfileScopeId } from '@/features/profile-scope/profile-scope';
import type { CronHealthState, HermesCronJobSummary } from '@hermes-console/runtime';

const formatCount = (value: number, singular: string, plural = `${singular}s`): string =>
  `${value} ${value === 1 ? singular : plural}`;

const readTime = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const formatNextRun = ({ jobs, now }: { jobs: HermesCronJobSummary[]; now: string }): string => {
  const nowTime = new Date(now).getTime();

  if (Number.isNaN(nowTime)) {
    return 'next run unknown';
  }

  const nextRunTime = jobs
    .map((job) => readTime(job.nextRunAt))
    .filter((time): time is number => time != null && time >= nowTime)
    .sort((left, right) => left - right)[0];

  if (nextRunTime == null) {
    return 'no upcoming run';
  }

  const minutes = Math.max(0, Math.round((nextRunTime - nowTime) / 60_000));

  if (minutes < 60) {
    return `next run in ${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0 ? `next run in ${hours}h` : `next run in ${hours}h ${remainingMinutes}m`;
};

const createScopedCronSearch = ({
  health,
  profileScope
}: {
  health?: CronHealthState;
  profileScope: ProfileScopeId;
}): CronFilterSearch => ({
  ...(isAllProfilesScope(profileScope) ? {} : { profile: profileScope }),
  ...(health ? createCronHealthSearch({ health }) : { sort: 'attention' as const })
});

export function OverviewCronHealth({
  jobs,
  loadedAt,
  profileScope
}: {
  jobs: HermesCronJobSummary[];
  loadedAt: string;
  profileScope: ProfileScopeId;
}) {
  const healthCounts = jobs.reduce(
    (counts, job) => ({
      ...counts,
      [readCronJobHealth({ job, now: loadedAt })]: counts[readCronJobHealth({ job, now: loadedAt })] + 1
    }),
    {
      healthy: 0,
      'failed-last-run': 0,
      'delivery-failed': 0,
      overdue: 0,
      paused: 0,
      'never-observed': 0,
      disabled: 0,
      'quiet-expected': 0,
      unknown: 0
    } satisfies Record<CronHealthState, number>
  );
  const summary = [
    formatCount(jobs.length, 'job'),
    `${healthCounts['failed-last-run']} failed`,
    `${healthCounts['delivery-failed']} delivery ${healthCounts['delivery-failed'] === 1 ? 'issue' : 'issues'}`,
    `${healthCounts.overdue} overdue`,
    formatNextRun({ jobs, now: loadedAt })
  ].join(' · ');

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Cron health</p>
          <h3 className="mt-2 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
            Reliability snapshot
          </h3>
          <p className="mt-2 text-sm leading-6 text-fg-muted">{summary}</p>
        </div>
        <Link
          className="rounded-md border border-border/80 bg-bg/40 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent/35 hover:text-fg"
          search={createScopedCronSearch({ profileScope })}
          to="/cron"
        >
          Open cron
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: 'failed',
            value: healthCounts['failed-last-run'],
            health: 'failed-last-run' as const
          },
          {
            label: 'delivery issues',
            value: healthCounts['delivery-failed'],
            health: 'delivery-failed' as const
          },
          {
            label: 'overdue',
            value: healthCounts.overdue,
            health: 'overdue' as const
          }
        ].map((item) => (
          <Link
            className="rounded-md border border-border/70 bg-bg/35 p-3 transition-colors hover:border-accent/35 hover:bg-accent/5"
            key={item.label}
            search={createScopedCronSearch({
              health: item.health,
              profileScope
            })}
            to="/cron"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-faint">{item.label}</p>
            <p className="mt-2 font-[family-name:var(--font-bricolage)] text-2xl font-semibold text-fg-strong">
              {item.value}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
