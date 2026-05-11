import { describe, expect, it } from 'vitest';

import { normalizeCronJobs } from '@/features/cron/read-cron';

describe('normalizeCronJobs', () => {
  it('derives recent run health and upcoming runs from observed runs and cron metadata', () => {
    const summaries = normalizeCronJobs({
      agent: {
        id: 'default',
        label: 'Default',
        rootPath: '/tmp/hermes',
        source: 'root'
      },
      rawJobs: {
        jobs: [
          {
            id: 'nightly-refresh',
            name: 'Nightly refresh',
            enabled: true,
            state: 'scheduled',
            schedule_display: '15 23 * * *',
            next_run_at: '2026-04-13T22:15:00.000Z',
            last_run_at: '2026-04-12T22:15:00.000Z',
            last_status: 'error',
            last_error: 'playbook failed',
            deliver: 'local',
            prompt: 'Run nightly refresh',
            script: 'nightly-refresh.py',
            no_agent: true,
            context_from: ['upstream-job'],
            enabled_toolsets: ['terminal', 'file'],
            workdir: '/tmp/workspace',
            schedule: {
              kind: 'cron',
              display: '15 23 * * *',
              expr: '15 23 * * *'
            }
          }
        ]
      },
      outputsByJobId: new Map([
        [
          'nightly-refresh',
          [
            {
              id: 'output-1',
              jobId: 'nightly-refresh',
              fileName: '2026-04-12-23-15.md',
              path: '/tmp/hermes/cron/output-1.md',
              createdAt: '2026-04-12T22:15:10.000Z',
              responsePreview: '[SILENT]',
              responseState: 'silent',
              rawContent: '[SILENT]'
            }
          ]
        ]
      ]),
      runsByJobId: new Map([
        [
          'nightly-refresh',
          [
            {
              id: 'run-1',
              jobId: 'nightly-refresh',
              startedAt: '2026-04-12T22:15:00.000Z',
              endedAt: '2026-04-12T22:15:12.000Z',
              durationMs: 12_000,
              success: false
            },
            {
              id: 'run-2',
              jobId: 'nightly-refresh',
              startedAt: '2026-04-11T22:15:00.000Z',
              endedAt: '2026-04-11T22:15:11.000Z',
              durationMs: 11_000,
              success: false
            },
            {
              id: 'run-3',
              jobId: 'nightly-refresh',
              startedAt: '2026-04-10T22:15:00.000Z',
              endedAt: '2026-04-10T22:15:08.000Z',
              durationMs: 8_000,
              success: true
            }
          ]
        ]
      ]),
      now: '2026-04-12T12:00:00.000Z'
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      recentObservedRunCount: 3,
      recentSuccessCount: 1,
      recentFailureCount: 2,
      recentSuccessRate: 0.33,
      failureStreak: 2,
      lastSuccessfulRunAt: '2026-04-10T22:15:00.000Z',
      lastFailedRunAt: '2026-04-12T22:15:00.000Z',
      latestOutputState: 'silent',
      recentOutputCount: 1,
      scriptPath: 'nightly-refresh.py',
      noAgent: true,
      contextFrom: ['upstream-job'],
      enabledToolsets: ['terminal', 'file'],
      workdir: '/tmp/workspace',
      attentionLevel: 'critical'
    });
    expect(summaries[0]?.upcomingRuns[0]?.scheduledAt).toBe('2026-04-13T22:15:00.000Z');
  });

  it('expands interval jobs into bounded upcoming runs', () => {
    const summaries = normalizeCronJobs({
      agent: {
        id: 'default',
        label: 'Default',
        rootPath: '/tmp/hermes',
        source: 'root'
      },
      rawJobs: {
        jobs: [
          {
            id: 'heartbeat',
            enabled: true,
            schedule_display: 'every 15 minutes',
            next_run_at: '2026-04-12T12:15:00.000Z',
            prompt: 'Heartbeat',
            schedule: {
              kind: 'interval',
              minutes: 15
            }
          }
        ]
      },
      outputsByJobId: new Map(),
      runsByJobId: new Map(),
      now: '2026-04-12T12:00:00.000Z'
    });

    expect(summaries[0]?.upcomingRuns.length ?? 0).toBeGreaterThan(100);
    expect(summaries[0]?.upcomingRuns[0]?.scheduledAt).toBe('2026-04-12T12:15:00.000Z');
    expect(summaries[0]?.upcomingRuns[1]?.scheduledAt).toBe('2026-04-12T12:30:00.000Z');
  });

  it('falls back to schedule display when Hermes omits a dedicated cron expression field', () => {
    const summaries = normalizeCronJobs({
      agent: {
        id: 'default',
        label: 'Default',
        rootPath: '/tmp/hermes',
        source: 'root'
      },
      rawJobs: {
        jobs: [
          {
            id: 'observer',
            enabled: true,
            schedule_display: '*/15 * * * *',
            next_run_at: '2026-04-12T12:15:00.000Z',
            prompt: 'Observe alerts',
            schedule: {
              kind: 'cron',
              display: '*/15 * * * *'
            }
          }
        ]
      },
      outputsByJobId: new Map(),
      runsByJobId: new Map(),
      now: '2026-04-12T12:00:00.000Z'
    });

    expect(summaries[0]?.upcomingRuns.length ?? 0).toBeGreaterThan(100);
    expect(summaries[0]?.upcomingRuns[0]?.scheduledAt).toBe('2026-04-12T12:15:00.000Z');
    expect(summaries[0]?.upcomingRuns[1]?.scheduledAt).toBe('2026-04-12T12:30:00.000Z');
  });
});
