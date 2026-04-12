import { CronExpressionParser } from 'cron-parser';

import type {
  CronAgentRef,
  CronJobsFileSource,
  CronJobRecord,
  CronJobSourceRecord,
  CronObservedRunRecord,
  CronRunOutputRecord,
  CronScheduleKind,
  CronUpcomingRun,
  HermesCronJobDetail,
  HermesCronJobSummary
} from '@hermes-console/runtime';
import { normalizeDateString } from '@hermes-console/runtime';

const RECENT_RUN_WINDOW_SIZE = 10;
const UPCOMING_RUN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_UPCOMING_RUNS_PER_JOB = 2_048;

function normalizeLastStatus(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function normalizeScheduleKind(value: unknown): CronScheduleKind {
  if (value === 'cron' || value === 'interval' || value === 'once') {
    return value;
  }

  return 'unknown';
}

function resolveStatusTone({
  enabled,
  state,
  lastStatus,
  lastError,
  lastDeliveryError
}: {
  enabled: boolean;
  state: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastDeliveryError: string | null;
}): HermesCronJobSummary['statusTone'] {
  if (state === 'paused' || !enabled) {
    return 'muted';
  }

  if (lastStatus === 'error' || Boolean(lastError) || Boolean(lastDeliveryError)) {
    return 'error';
  }

  if (lastStatus === 'running' || lastStatus === 'pending') {
    return 'warning';
  }

  return 'healthy';
}

function normalizePrompt(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isFailureStatus(value: string | null) {
  if (!value) {
    return false;
  }

  return ['error', 'failed', 'failure', 'cancelled', 'timeout', 'timed_out', 'crashed'].includes(value.toLowerCase());
}

function resolveObservedRunSummary(runs: CronObservedRunRecord[]) {
  const sortedRuns = [...runs].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
  );
  const recentRuns = sortedRuns.slice(0, RECENT_RUN_WINDOW_SIZE);

  let failureStreak = 0;
  for (const run of sortedRuns) {
    if (run.success) {
      break;
    }
    failureStreak += 1;
  }

  const durations = sortedRuns
    .map((run) => run.durationMs)
    .filter((value): value is number => typeof value === 'number' && value >= 0);
  const averageDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
  const recentObservedRunCount = recentRuns.length;
  const recentFailureCount = recentRuns.filter((run) => !run.success).length;
  const recentSuccessCount = recentRuns.filter((run) => run.success).length;
  const recentSuccessRate =
    recentObservedRunCount > 0 ? Number((recentSuccessCount / recentObservedRunCount).toFixed(2)) : null;

  return {
    failureStreak,
    recentObservedRunCount,
    recentSuccessCount,
    recentFailureCount,
    recentSuccessRate,
    observedRunCount: sortedRuns.length,
    lastSuccessfulRunAt: sortedRuns.find((run) => run.success)?.startedAt ?? null,
    lastFailedRunAt: sortedRuns.find((run) => !run.success)?.startedAt ?? null,
    latestDurationMs: sortedRuns[0]?.durationMs ?? null,
    averageDurationMs,
    recentRuns
  };
}

function resolveAttentionLevel({
  enabled,
  state,
  overdue,
  failureStreak,
  recentFailureCount,
  recentObservedRunCount,
  lastStatus,
  lastError,
  lastDeliveryError
}: {
  enabled: boolean;
  state: string | null;
  overdue: boolean;
  failureStreak: number;
  recentFailureCount: number;
  recentObservedRunCount: number;
  lastStatus: string | null;
  lastError: string | null;
  lastDeliveryError: string | null;
}): HermesCronJobSummary['attentionLevel'] {
  if (!enabled || state === 'paused') {
    return 'muted';
  }

  if (
    failureStreak >= 2 ||
    recentFailureCount >= 3 ||
    (recentObservedRunCount >= 4 && recentFailureCount / recentObservedRunCount >= 0.5)
  ) {
    return 'critical';
  }

  if (
    overdue ||
    recentFailureCount > 0 ||
    isFailureStatus(lastStatus) ||
    Boolean(lastError) ||
    Boolean(lastDeliveryError)
  ) {
    return 'warning';
  }

  return 'healthy';
}

function resolveScheduleExpression(job: CronJobSourceRecord) {
  const schedule = job.schedule ?? null;
  const scheduleKind = normalizeScheduleKind(schedule?.kind ?? null);

  if (scheduleKind === 'cron') {
    return schedule?.expr ?? schedule?.display ?? job.schedule_display ?? null;
  }

  if (scheduleKind === 'interval') {
    return typeof schedule?.minutes === 'number' ? `every ${schedule.minutes}m` : (schedule?.display ?? null);
  }

  if (scheduleKind === 'once') {
    return schedule?.run_at ?? null;
  }

  return schedule?.display ?? null;
}

function extractCronParts(rawValue: string | null): { expr: string; tz: string | undefined } | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();

  if (!trimmed || trimmed.startsWith('@') || trimmed.toLowerCase().startsWith('every ')) {
    return null;
  }

  const withoutPrefix = trimmed.toLowerCase().startsWith('cron ') ? trimmed.slice(5).trim() : trimmed;
  const parts = withoutPrefix.split(/\s+/);

  if (parts.length < 5) {
    return null;
  }

  const trailingPart = parts.at(-1);

  if (trailingPart && (trailingPart.includes('/') || trailingPart === 'UTC')) {
    return {
      expr: parts.slice(0, -1).join(' '),
      tz: trailingPart
    };
  }

  return {
    expr: withoutPrefix,
    tz: undefined
  };
}

function createUpcomingRun(id: string, scheduledAt: Date): CronUpcomingRun {
  return {
    id,
    scheduledAt: scheduledAt.toISOString()
  };
}

function buildUpcomingRuns({
  jobId,
  rawJob,
  nextRunAt,
  now = new Date()
}: {
  jobId: string;
  rawJob: CronJobSourceRecord;
  nextRunAt: string | null;
  now?: Date;
}) {
  const schedule = rawJob.schedule ?? null;
  const scheduleKind = normalizeScheduleKind(schedule?.kind ?? null);
  const windowEndMs = now.getTime() + UPCOMING_RUN_WINDOW_MS;

  if (scheduleKind === 'once') {
    if (!nextRunAt) {
      return [];
    }

    const nextRun = new Date(nextRunAt);

    if (Number.isNaN(nextRun.getTime()) || nextRun.getTime() > windowEndMs) {
      return [];
    }

    return [createUpcomingRun(`${jobId}:0`, nextRun)];
  }

  if (scheduleKind === 'interval') {
    const minutes = typeof schedule?.minutes === 'number' ? schedule.minutes : null;

    if (minutes == null || minutes <= 0) {
      return nextRunAt
        ? [createUpcomingRun(`${jobId}:0`, new Date(nextRunAt))].filter(
            (run) =>
              !Number.isNaN(new Date(run.scheduledAt).getTime()) && new Date(run.scheduledAt).getTime() <= windowEndMs
          )
        : [];
    }

    const firstRun =
      nextRunAt && !Number.isNaN(new Date(nextRunAt).getTime())
        ? new Date(nextRunAt)
        : new Date(now.getTime() + minutes * 60 * 1000);

    const intervalRunCount = Math.min(
      Math.ceil(UPCOMING_RUN_WINDOW_MS / (minutes * 60 * 1000)),
      MAX_UPCOMING_RUNS_PER_JOB
    );

    return Array.from({ length: intervalRunCount })
      .map((_, index) => new Date(firstRun.getTime() + index * minutes * 60 * 1000))
      .filter((scheduledAt) => scheduledAt.getTime() <= windowEndMs)
      .map((scheduledAt, index) => createUpcomingRun(`${jobId}:${index}`, scheduledAt));
  }

  const cronParts = extractCronParts(schedule?.expr ?? schedule?.display ?? rawJob.schedule_display ?? null);

  if (scheduleKind === 'cron' && cronParts) {
    const runs: CronUpcomingRun[] = [];
    const seededNextRun = nextRunAt && !Number.isNaN(new Date(nextRunAt).getTime()) ? new Date(nextRunAt) : null;

    if (seededNextRun && seededNextRun.getTime() <= windowEndMs) {
      runs.push(createUpcomingRun(`${jobId}:0`, seededNextRun));
    }

    try {
      const parser = CronExpressionParser.parse(cronParts.expr, {
        currentDate: seededNextRun ? new Date(seededNextRun.getTime() + 1000) : now,
        ...(cronParts.tz ? { tz: cronParts.tz } : {})
      });

      while (parser.hasNext() && runs.length < MAX_UPCOMING_RUNS_PER_JOB) {
        const nextRun = parser.next().toDate();

        if (nextRun.getTime() > windowEndMs) {
          break;
        }

        runs.push(createUpcomingRun(`${jobId}:${runs.length}`, nextRun));
      }
    } catch {
      return seededNextRun ? runs : [];
    }

    return runs;
  }

  return nextRunAt && !Number.isNaN(new Date(nextRunAt).getTime())
    ? [createUpcomingRun(`${jobId}:0`, new Date(nextRunAt))].filter(
        (run) => new Date(run.scheduledAt).getTime() <= windowEndMs
      )
    : [];
}

export function normalizeCronJobs({
  agent,
  rawJobs,
  outputsByJobId,
  runsByJobId,
  now = new Date().toISOString()
}: {
  agent: CronAgentRef;
  rawJobs: CronJobsFileSource;
  outputsByJobId: Map<string, CronRunOutputRecord[]>;
  runsByJobId: Map<string, CronObservedRunRecord[]>;
  now?: string;
}): HermesCronJobSummary[] {
  const jobs = rawJobs.jobs;
  const currentTime = new Date(now);

  return jobs
    .map((job: CronJobSourceRecord) => {
      const jobId = job.id;
      const outputs = outputsByJobId.get(jobId) ?? [];
      const latestOutput = outputs[0] ?? null;
      const observedRuns = runsByJobId.get(jobId) ?? [];
      const enabled = Boolean(job.enabled);
      const lastStatus = normalizeLastStatus(job.last_status ?? null);
      const lastError = job.last_error ?? null;
      const lastDeliveryError = job.last_delivery_error ?? null;

      const schedule = job.schedule ?? null;
      const repeat = job.repeat ?? null;
      const origin = job.origin ?? null;
      const observedSummary = resolveObservedRunSummary(observedRuns);
      const nextRunAt = normalizeDateString(job.next_run_at ?? null);
      const overdue =
        enabled && Boolean(nextRunAt) && currentTime.getTime() - new Date(nextRunAt!).getTime() > 30 * 60 * 1000;
      const attentionLevel = resolveAttentionLevel({
        enabled,
        state: job.state ?? null,
        overdue,
        failureStreak: observedSummary.failureStreak,
        recentFailureCount: observedSummary.recentFailureCount,
        recentObservedRunCount: observedSummary.recentObservedRunCount,
        lastStatus,
        lastError,
        lastDeliveryError
      });

      return {
        summaryId: `${agent.id}:${jobId}`,
        id: jobId,
        jobId,
        name: job.name ?? jobId,
        agentId: agent.id,
        agentLabel: agent.label,
        agentRootPath: agent.rootPath,
        enabled,
        state: job.state ?? null,
        scheduleDisplay: job.schedule_display ?? schedule?.display ?? 'unknown',
        scheduleKind: normalizeScheduleKind(schedule?.kind ?? null),
        scheduleExpression: resolveScheduleExpression(job),
        model: job.model ?? null,
        provider: job.provider ?? null,
        baseUrl: job.base_url ?? null,
        scriptPath: job.script ?? null,
        createdAt: normalizeDateString(job.created_at ?? null),
        nextRunAt,
        lastRunAt: normalizeDateString(job.last_run_at ?? null),
        pausedAt: normalizeDateString(job.paused_at ?? null),
        pausedReason: job.paused_reason ?? null,
        lastStatus,
        lastError,
        lastDeliveryError,
        deliver: job.deliver ?? null,
        prompt: normalizePrompt(job.prompt ?? null),
        skills: job.skills ?? [],
        skill: job.skill ?? null,
        repeatCompleted: repeat?.completed ?? null,
        repeatTimes: repeat?.times ?? null,
        originChatName: origin?.chat_name ?? null,
        statusTone: resolveStatusTone({
          enabled,
          state: job.state ?? null,
          lastStatus,
          lastError,
          lastDeliveryError
        }),
        attentionLevel,
        overdue,
        failureStreak: observedSummary.failureStreak,
        recentObservedRunCount: observedSummary.recentObservedRunCount,
        recentSuccessCount: observedSummary.recentSuccessCount,
        recentFailureCount: observedSummary.recentFailureCount,
        recentSuccessRate: observedSummary.recentSuccessRate,
        observedRunCount: observedSummary.observedRunCount,
        lastSuccessfulRunAt: observedSummary.lastSuccessfulRunAt,
        lastFailedRunAt: observedSummary.lastFailedRunAt,
        latestDurationMs: observedSummary.latestDurationMs,
        averageDurationMs: observedSummary.averageDurationMs,
        latestOutputState: latestOutput?.responseState ?? 'missing',
        recentOutputCount: outputs.length,
        upcomingRuns: buildUpcomingRuns({
          jobId,
          rawJob: job,
          nextRunAt,
          now: currentTime
        })
      } satisfies HermesCronJobSummary;
    })
    .sort((left, right) => {
      const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : 0;
      const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export function buildCronJobDetail({
  job,
  outputs,
  observedRuns
}: {
  job: CronJobRecord | HermesCronJobSummary;
  outputs: CronRunOutputRecord[];
  observedRuns: CronObservedRunRecord[];
}): HermesCronJobDetail {
  const sortedObservedRuns = [...observedRuns].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
  );

  return {
    job: {
      ...(job as HermesCronJobSummary)
    },
    outputs,
    observedRuns: sortedObservedRuns.slice(0, 20),
    upcomingRuns: 'upcomingRuns' in job ? job.upcomingRuns : [],
    recentOutputCount: outputs.length,
    latestOutputState: outputs[0]?.responseState ?? 'missing',
    hasOutputs: outputs.length > 0
  };
}

export type { CronJobRecord, CronObservedRunRecord, CronRunOutputRecord } from '@hermes-console/runtime';
