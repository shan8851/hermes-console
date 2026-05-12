import { z } from 'zod';

import type { HermesCronJobSummary } from './types.js';

export const cronHealthStateSchema = z.enum([
  'healthy',
  'failed-last-run',
  'delivery-failed',
  'overdue',
  'paused',
  'never-observed',
  'disabled',
  'quiet-expected',
  'unknown'
]);

export type CronHealthState = z.infer<typeof cronHealthStateSchema>;

export type CronHealthClassifiableJob = Pick<
  HermesCronJobSummary,
  | 'attentionLevel'
  | 'enabled'
  | 'lastDeliveryError'
  | 'lastError'
  | 'lastFailedRunAt'
  | 'lastRunAt'
  | 'lastStatus'
  | 'lastSuccessfulRunAt'
  | 'latestOutputState'
  | 'noAgent'
  | 'observedRunCount'
  | 'overdue'
  | 'pausedAt'
  | 'pausedReason'
  | 'recentOutputCount'
  | 'scriptPath'
  | 'state'
  | 'statusTone'
  | 'nextRunAt'
>;

export type CronHealthOptions = {
  now?: Date | string;
  overdueGraceMs?: number;
};

const DEFAULT_OVERDUE_GRACE_MS = 30 * 60 * 1000;

const FAILURE_STATUSES = new Set(['error', 'failed', 'failure', 'cancelled', 'timeout', 'timed_out', 'crashed']);
const SUCCESS_STATUSES = new Set(['ok', 'success', 'succeeded', 'complete', 'completed', 'cron_complete']);

const hasText = (value: string | null): boolean => value != null && value.trim().length > 0;

const normalizeStatus = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const readTime = (value: Date | string | null | undefined): number | null => {
  if (value == null) {
    return null;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const hasFailedMoreRecentlyThanSuccess = ({
  lastFailedRunAt,
  lastSuccessfulRunAt
}: Pick<CronHealthClassifiableJob, 'lastFailedRunAt' | 'lastSuccessfulRunAt'>): boolean => {
  const lastFailedTime = readTime(lastFailedRunAt);

  if (lastFailedTime == null) {
    return false;
  }

  const lastSuccessfulTime = readTime(lastSuccessfulRunAt);
  return lastSuccessfulTime == null || lastFailedTime > lastSuccessfulTime;
};

const isOverdue = ({
  job,
  now,
  overdueGraceMs
}: {
  job: CronHealthClassifiableJob;
  now: Date | string;
  overdueGraceMs: number;
}): boolean => {
  const nowTime = readTime(now);
  const nextRunTime = readTime(job.nextRunAt);

  if (nowTime != null && nextRunTime != null && nowTime - nextRunTime > overdueGraceMs) {
    return true;
  }

  return job.overdue && nowTime != null;
};

const isQuietExpected = (job: CronHealthClassifiableJob): boolean =>
  job.noAgent &&
  hasText(job.scriptPath) &&
  job.latestOutputState === 'silent' &&
  (hasText(job.lastRunAt) || job.observedRunCount > 0 || job.recentOutputCount > 0);

export const classifyCronHealth = (
  job: CronHealthClassifiableJob,
  options: CronHealthOptions = {}
): CronHealthState => {
  if (!job.enabled) {
    return 'disabled';
  }

  if (job.state === 'paused' || hasText(job.pausedAt) || hasText(job.pausedReason)) {
    return 'paused';
  }

  if (hasText(job.lastDeliveryError)) {
    return 'delivery-failed';
  }

  const lastStatus = normalizeStatus(job.lastStatus);

  if (
    (lastStatus != null && FAILURE_STATUSES.has(lastStatus)) ||
    hasText(job.lastError) ||
    hasFailedMoreRecentlyThanSuccess(job)
  ) {
    return 'failed-last-run';
  }

  if (
    isOverdue({
      job,
      now: options.now ?? new Date(),
      overdueGraceMs: options.overdueGraceMs ?? DEFAULT_OVERDUE_GRACE_MS
    })
  ) {
    return 'overdue';
  }

  if (!hasText(job.lastRunAt) && job.observedRunCount === 0) {
    return 'never-observed';
  }

  if (isQuietExpected(job)) {
    return 'quiet-expected';
  }

  if (
    (lastStatus != null && SUCCESS_STATUSES.has(lastStatus)) ||
    job.lastSuccessfulRunAt != null ||
    job.attentionLevel === 'healthy' ||
    job.statusTone === 'healthy'
  ) {
    return 'healthy';
  }

  return 'unknown';
};
