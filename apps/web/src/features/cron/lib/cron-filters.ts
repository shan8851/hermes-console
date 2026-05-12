import {
  classifyCronHealth,
  cronHealthStateSchema,
  type CronHealthState,
  type HermesCronJobSummary
} from '@hermes-console/runtime';

export const CRON_SORT_VALUES = ['attention', 'next-run', 'last-run', 'name', 'profile'] as const;

export type CronSort = (typeof CRON_SORT_VALUES)[number];

export type CronFilterSearch = {
  context?: 'from' | undefined;
  enabled?: 'enabled' | 'disabled' | undefined;
  health?: CronHealthState | undefined;
  mode?: 'no-agent' | undefined;
  profile?: string | undefined;
  q?: string | undefined;
  script?: 'only' | undefined;
  sort?: CronSort | undefined;
  workdir?: 'present' | undefined;
};

export type CronFilterOptions = {
  now: string;
  search: CronFilterSearch;
};

const HEALTH_ATTENTION_RANK: Record<CronHealthState, number> = {
  'delivery-failed': 0,
  'failed-last-run': 1,
  overdue: 2,
  paused: 3,
  'never-observed': 4,
  unknown: 5,
  'quiet-expected': 6,
  disabled: 7,
  healthy: 8
};

export const CRON_HEALTH_LABELS: Record<CronHealthState, string> = {
  healthy: 'Healthy',
  'failed-last-run': 'Failed last run',
  'delivery-failed': 'Delivery failed',
  overdue: 'Overdue',
  paused: 'Paused',
  'never-observed': 'Never observed',
  disabled: 'Disabled',
  'quiet-expected': 'Quiet expected',
  unknown: 'Unknown'
};

export const CRON_SORT_LABELS: Record<CronSort, string> = {
  attention: 'Needs attention',
  'next-run': 'Next run',
  'last-run': 'Last run',
  name: 'Name',
  profile: 'Profile'
};

const readStringSearchParam = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const readEnumSearchParam = <Value extends string>({
  value,
  values
}: {
  value: unknown;
  values: readonly Value[];
}): Value | undefined => (typeof value === 'string' && values.includes(value as Value) ? (value as Value) : undefined);

const readCronHealthSearchParam = (value: unknown): CronHealthState | undefined => {
  const parsed = cronHealthStateSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export const normalizeCronFilterSearch = (search: Record<string, unknown>): CronFilterSearch => {
  const context = readEnumSearchParam({ value: search.context, values: ['from'] as const });
  const enabled = readEnumSearchParam({ value: search.enabled, values: ['enabled', 'disabled'] as const });
  const health = readCronHealthSearchParam(search.health);
  const mode = readEnumSearchParam({ value: search.mode, values: ['no-agent'] as const });
  const profile = readStringSearchParam(search.profile);
  const q = readStringSearchParam(search.q);
  const script = readEnumSearchParam({ value: search.script, values: ['only'] as const });
  const sort = readEnumSearchParam({ value: search.sort, values: CRON_SORT_VALUES });
  const workdir = readEnumSearchParam({ value: search.workdir, values: ['present'] as const });

  return {
    ...(context ? { context } : {}),
    ...(enabled ? { enabled } : {}),
    ...(health ? { health } : {}),
    ...(mode ? { mode } : {}),
    ...(profile ? { profile } : {}),
    ...(q ? { q } : {}),
    ...(script ? { script } : {}),
    ...(sort ? { sort } : {}),
    ...(workdir ? { workdir } : {})
  };
};

export const readCronJobHealth = ({ job, now }: { job: HermesCronJobSummary; now: string }): CronHealthState =>
  classifyCronHealth(job, { now });

const readTime = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const compareNullableTimesAscending = (left: string | null, right: string | null): number => {
  const leftTime = readTime(left);
  const rightTime = readTime(right);

  if (leftTime == null && rightTime == null) {
    return 0;
  }

  if (leftTime == null) {
    return 1;
  }

  if (rightTime == null) {
    return -1;
  }

  return leftTime - rightTime;
};

const compareNullableTimesDescending = (left: string | null, right: string | null): number =>
  compareNullableTimesAscending(right, left);

const compareText = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

const readSearchText = (job: HermesCronJobSummary): string =>
  [
    job.name,
    job.scheduleDisplay,
    job.scheduleExpression,
    job.deliver,
    job.originChatName,
    job.id,
    job.jobId,
    job.agentLabel,
    job.agentId,
    job.model,
    job.provider,
    job.pausedReason,
    job.lastError,
    job.lastDeliveryError,
    job.scriptPath,
    job.workdir,
    ...job.contextFrom,
    ...job.enabledToolsets,
    ...job.skills
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();

const matchesSearch = ({ job, query }: { job: HermesCronJobSummary; query: string }): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery.length === 0 || readSearchText(job).includes(normalizedQuery);
};

const matchesFilters = ({ job, now, search }: { job: HermesCronJobSummary; now: string; search: CronFilterSearch }) => {
  if (search.health && readCronJobHealth({ job, now }) !== search.health) {
    return false;
  }

  if (search.script === 'only' && job.scriptPath == null) {
    return false;
  }

  if (search.mode === 'no-agent' && !job.noAgent) {
    return false;
  }

  if (search.context === 'from' && job.contextFrom.length === 0) {
    return false;
  }

  if (search.workdir === 'present' && job.workdir == null) {
    return false;
  }

  if (search.enabled === 'enabled' && !job.enabled) {
    return false;
  }

  if (search.enabled === 'disabled' && job.enabled) {
    return false;
  }

  return matchesSearch({
    job,
    query: search.q ?? ''
  });
};

const compareByAttention = ({
  left,
  now,
  right
}: {
  left: HermesCronJobSummary;
  now: string;
  right: HermesCronJobSummary;
}) => {
  const healthDelta =
    HEALTH_ATTENTION_RANK[readCronJobHealth({ job: left, now })] -
    HEALTH_ATTENTION_RANK[readCronJobHealth({ job: right, now })];

  if (healthDelta !== 0) {
    return healthDelta;
  }

  return compareNullableTimesAscending(left.nextRunAt, right.nextRunAt) || compareText(left.name, right.name);
};

export const sortCronJobs = ({
  jobs,
  now,
  sort
}: {
  jobs: HermesCronJobSummary[];
  now: string;
  sort: CronSort;
}): HermesCronJobSummary[] =>
  [...jobs].sort((left, right) => {
    switch (sort) {
      case 'next-run':
        return compareNullableTimesAscending(left.nextRunAt, right.nextRunAt) || compareText(left.name, right.name);
      case 'last-run':
        return compareNullableTimesDescending(left.lastRunAt, right.lastRunAt) || compareText(left.name, right.name);
      case 'name':
        return compareText(left.name, right.name) || compareText(left.agentLabel, right.agentLabel);
      case 'profile':
        return compareText(left.agentLabel, right.agentLabel) || compareText(left.name, right.name);
      case 'attention':
        return compareByAttention({ left, now, right });
    }
  });

export const filterCronJobs = ({ jobs, now, search }: { jobs: HermesCronJobSummary[] } & CronFilterOptions) =>
  sortCronJobs({
    jobs: jobs.filter((job) => matchesFilters({ job, now, search })),
    now,
    sort: search.sort ?? 'attention'
  });

export const hasActiveCronFilters = (search: CronFilterSearch): boolean =>
  Boolean(
    search.context ||
    search.enabled ||
    search.health ||
    search.mode ||
    search.q?.trim() ||
    search.script ||
    search.workdir ||
    (search.sort && search.sort !== 'attention')
  );

export const clearCronFilters = (search: CronFilterSearch): CronFilterSearch =>
  search.profile
    ? {
        profile: search.profile
      }
    : {};

export const createCronHealthSearch = ({
  health,
  profile
}: {
  health: CronHealthState;
  profile?: string;
}): CronFilterSearch => ({
  ...(profile ? { profile } : {}),
  health,
  sort: 'attention'
});
