import { describe, expect, it } from 'vitest';

import { buildCronDependencies } from '@/features/cron/lib/cron-dependencies';
import type { HermesCronJobSummary } from '@hermes-console/runtime';

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
  name: 'Job',
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

describe('buildCronDependencies', () => {
  it('resolves same-agent upstream references and downstream jobs', () => {
    const upstream = createJob({
      jobId: 'prepare',
      name: 'Prepare context',
      summaryId: 'default:prepare'
    });
    const current = createJob({
      contextFrom: ['prepare'],
      jobId: 'digest',
      name: 'Digest',
      summaryId: 'default:digest'
    });
    const downstream = createJob({
      contextFrom: ['digest'],
      jobId: 'publish',
      name: 'Publish',
      summaryId: 'default:publish'
    });

    const dependencies = buildCronDependencies({ currentJob: current, jobs: [upstream, current, downstream] });

    expect(
      dependencies.upstream.map((dependency) => ({
        jobId: dependency.job?.summaryId,
        reference: dependency.reference,
        status: dependency.status
      }))
    ).toEqual([
      {
        jobId: 'default:prepare',
        reference: 'prepare',
        status: 'resolved'
      }
    ]);
    expect(
      dependencies.downstream.map((dependency) => ({
        jobId: dependency.job?.summaryId,
        reference: dependency.reference,
        status: dependency.status
      }))
    ).toEqual([
      {
        jobId: 'default:publish',
        reference: 'publish',
        status: 'resolved'
      }
    ]);
  });

  it('marks missing upstream references unresolved', () => {
    const current = createJob({
      contextFrom: ['missing-job'],
      jobId: 'digest',
      summaryId: 'default:digest'
    });

    expect(
      buildCronDependencies({ currentJob: current, jobs: [current] }).upstream.map((dependency) => ({
        jobId: dependency.job?.summaryId ?? null,
        reference: dependency.reference,
        status: dependency.status
      }))
    ).toEqual([
      {
        jobId: null,
        reference: 'missing-job',
        status: 'unresolved'
      }
    ]);
  });

  it('marks cross-agent job id references ambiguous when they are not unique', () => {
    const alpha = createJob({
      agentId: 'alpha',
      agentLabel: 'alpha',
      jobId: 'prepare',
      summaryId: 'alpha:prepare'
    });
    const beta = createJob({
      agentId: 'beta',
      agentLabel: 'beta',
      jobId: 'prepare',
      summaryId: 'beta:prepare'
    });
    const current = createJob({
      agentId: 'gamma',
      agentLabel: 'gamma',
      contextFrom: ['prepare'],
      jobId: 'digest',
      summaryId: 'gamma:digest'
    });

    expect(
      buildCronDependencies({ currentJob: current, jobs: [alpha, beta, current] }).upstream.map((dependency) => ({
        jobId: dependency.job?.summaryId ?? null,
        reference: dependency.reference,
        status: dependency.status
      }))
    ).toEqual([
      {
        jobId: null,
        reference: 'prepare',
        status: 'ambiguous'
      }
    ]);
  });

  it('does not create downstream links from ambiguous bare cross-profile references', () => {
    const current = createJob({
      agentId: 'alpha',
      agentLabel: 'alpha',
      jobId: 'prepare',
      name: 'Alpha prepare',
      summaryId: 'alpha:prepare'
    });
    const otherPrepare = createJob({
      agentId: 'beta',
      agentLabel: 'beta',
      jobId: 'prepare',
      name: 'Beta prepare',
      summaryId: 'beta:prepare'
    });
    const downstream = createJob({
      agentId: 'gamma',
      agentLabel: 'gamma',
      contextFrom: ['prepare'],
      jobId: 'digest',
      summaryId: 'gamma:digest'
    });

    expect(
      buildCronDependencies({ currentJob: current, jobs: [current, otherPrepare, downstream] }).downstream
    ).toEqual([]);
  });

  it('keeps downstream links for same-agent and unique cross-profile references', () => {
    const current = createJob({
      agentId: 'alpha',
      agentLabel: 'alpha',
      jobId: 'prepare',
      summaryId: 'alpha:prepare'
    });
    const sameAgentDownstream = createJob({
      agentId: 'alpha',
      agentLabel: 'alpha',
      contextFrom: ['prepare'],
      jobId: 'digest',
      name: 'Digest',
      summaryId: 'alpha:digest'
    });
    const uniqueCrossProfileDownstream = createJob({
      agentId: 'beta',
      agentLabel: 'beta',
      contextFrom: ['prepare'],
      jobId: 'publish',
      name: 'Publish',
      summaryId: 'beta:publish'
    });

    expect(
      buildCronDependencies({
        currentJob: current,
        jobs: [current, sameAgentDownstream, uniqueCrossProfileDownstream]
      }).downstream.map((dependency) => dependency.job?.summaryId)
    ).toEqual(['alpha:digest', 'beta:publish']);
  });
});
