import { describe, expect, it } from 'vitest';

import {
  clearCronFilters,
  filterCronJobs,
  hasActiveCronFilters,
  normalizeCronFilterSearch
} from '@/features/cron/lib/cron-filters';
import type { HermesCronJobSummary } from '@hermes-console/runtime';

const now = '2026-04-12T12:00:00.000Z';

const createJob = (overrides: Partial<HermesCronJobSummary> = {}): HermesCronJobSummary => ({
  agentId: 'default',
  agentLabel: 'Default',
  agentRootPath: '/tmp/hermes',
  attentionLevel: 'healthy',
  averageDurationMs: 1000,
  baseUrl: null,
  contextFrom: [],
  createdAt: '2026-04-12T09:00:00.000Z',
  deliver: 'local',
  enabled: true,
  enabledToolsets: [],
  failureStreak: 0,
  id: 'job-1',
  jobId: 'job-1',
  lastDeliveryError: null,
  lastError: null,
  lastFailedRunAt: null,
  lastRunAt: '2026-04-12T11:00:00.000Z',
  lastStatus: 'success',
  lastSuccessfulRunAt: '2026-04-12T11:00:00.000Z',
  latestDurationMs: 1000,
  latestOutputState: 'contentful',
  model: null,
  name: 'Healthy job',
  nextRunAt: '2026-04-12T13:00:00.000Z',
  noAgent: false,
  observedRunCount: 1,
  originChatName: null,
  overdue: false,
  pausedAt: null,
  pausedReason: null,
  prompt: 'Run the job',
  provider: null,
  recentFailureCount: 0,
  recentObservedRunCount: 1,
  recentOutputCount: 1,
  recentSuccessCount: 1,
  recentSuccessRate: 1,
  repeatCompleted: null,
  repeatTimes: null,
  scheduleDisplay: 'every hour',
  scheduleExpression: '1h',
  scheduleKind: 'interval',
  scriptPath: null,
  skill: null,
  skills: [],
  state: 'scheduled',
  statusTone: 'healthy',
  summaryId: 'default:job-1',
  upcomingRuns: [],
  workdir: null,
  ...overrides
});

describe('cron filter helpers', () => {
  it('filters by health, script-only, no-agent, context, workdir, enabled state, and search', () => {
    const jobs = [
      createJob({
        contextFrom: ['upstream'],
        jobId: 'script-job',
        name: 'Script delivery job',
        noAgent: true,
        scriptPath: 'ops.py',
        summaryId: 'default:script-job',
        workdir: '/tmp/workspace'
      }),
      createJob({
        enabled: false,
        jobId: 'disabled-job',
        name: 'Disabled job',
        summaryId: 'default:disabled-job'
      })
    ];

    expect(
      filterCronJobs({
        jobs,
        now,
        search: {
          context: 'from',
          enabled: 'enabled',
          health: 'healthy',
          mode: 'no-agent',
          q: 'delivery',
          script: 'only',
          workdir: 'present'
        }
      }).map((job) => job.jobId)
    ).toEqual(['script-job']);
  });

  it('sorts jobs by attention first by default', () => {
    const jobs = [
      createJob({
        jobId: 'healthy',
        name: 'Healthy',
        summaryId: 'default:healthy'
      }),
      createJob({
        jobId: 'delivery',
        lastDeliveryError: 'delivery failed',
        name: 'Delivery',
        summaryId: 'default:delivery'
      }),
      createJob({
        jobId: 'failed',
        lastError: 'failed',
        name: 'Failed',
        summaryId: 'default:failed'
      })
    ];

    expect(filterCronJobs({ jobs, now, search: {} }).map((job) => job.jobId)).toEqual([
      'delivery',
      'failed',
      'healthy'
    ]);
  });

  it('sorts by next run, last run, name, and profile', () => {
    const jobs = [
      createJob({
        agentLabel: 'Zulu',
        jobId: 'b',
        lastRunAt: '2026-04-12T10:00:00.000Z',
        name: 'Bravo',
        nextRunAt: '2026-04-12T15:00:00.000Z',
        summaryId: 'zulu:b'
      }),
      createJob({
        agentLabel: 'Alpha',
        jobId: 'a',
        lastRunAt: '2026-04-12T11:00:00.000Z',
        name: 'Alpha',
        nextRunAt: '2026-04-12T14:00:00.000Z',
        summaryId: 'alpha:a'
      })
    ];

    expect(filterCronJobs({ jobs, now, search: { sort: 'next-run' } }).map((job) => job.jobId)).toEqual(['a', 'b']);
    expect(filterCronJobs({ jobs, now, search: { sort: 'last-run' } }).map((job) => job.jobId)).toEqual(['a', 'b']);
    expect(filterCronJobs({ jobs, now, search: { sort: 'name' } }).map((job) => job.jobId)).toEqual(['a', 'b']);
    expect(filterCronJobs({ jobs, now, search: { sort: 'profile' } }).map((job) => job.jobId)).toEqual(['a', 'b']);
  });

  it('detects active filters and clears them without dropping profile scope', () => {
    expect(hasActiveCronFilters({ profile: 'nigel' })).toBe(false);
    expect(hasActiveCronFilters({ profile: 'nigel', health: 'failed-last-run' })).toBe(true);
    expect(clearCronFilters({ health: 'failed-last-run', profile: 'nigel', q: 'sync' })).toEqual({
      profile: 'nigel'
    });
  });

  it('drops invalid URL filter values while preserving valid profile and search text', () => {
    expect(
      normalizeCronFilterSearch({
        context: 'bad',
        enabled: 'yes',
        health: 'broken',
        mode: 'agent',
        profile: 'nigel',
        q: 'sync',
        script: 'false',
        sort: 'random',
        workdir: 'nope'
      })
    ).toEqual({
      profile: 'nigel',
      q: 'sync'
    });
  });
});
