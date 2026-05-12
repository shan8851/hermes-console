import { classifyCronHealth, type CronHealthState, type HermesCronJobSummary } from '@hermes-console/runtime';

type CronJobBadge = {
  className: string;
  label: string;
};

const healthBadgeLabels: Record<CronHealthState, string> = {
  healthy: 'healthy',
  'failed-last-run': 'failed',
  'delivery-failed': 'delivery failed',
  overdue: 'overdue',
  paused: 'paused',
  'never-observed': 'never observed',
  disabled: 'disabled',
  'quiet-expected': 'quiet expected',
  unknown: 'unknown'
};

const healthBadgeClasses: Record<CronHealthState, string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  'failed-last-run': 'border-red-500/30 bg-red-500/10 text-red-200',
  'delivery-failed': 'border-red-500/30 bg-red-500/10 text-red-200',
  overdue: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  paused: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  'never-observed': 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  disabled: 'border-border/80 bg-bg/40 text-fg-muted',
  'quiet-expected': 'border-border/80 bg-bg/40 text-fg-muted',
  unknown: 'border-border/80 bg-bg/40 text-fg-muted'
};

export function getCronJobStateBadge({ job, now }: { job: HermesCronJobSummary; now: string }): CronJobBadge | null {
  const health = classifyCronHealth(job, { now });

  return health === 'healthy'
    ? null
    : {
        label: healthBadgeLabels[health],
        className: healthBadgeClasses[health]
      };
}

export function getCronOutputBadge(job: HermesCronJobSummary): CronJobBadge | null {
  if (job.latestOutputState === 'silent') {
    return {
      label: 'silent',
      className: 'border-border/80 bg-bg/40 text-fg-muted'
    };
  }

  if (job.latestOutputState === 'missing') {
    return {
      label: 'no output',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    };
  }

  return null;
}
