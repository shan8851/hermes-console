import { describe, expect, it } from 'vitest';

import { classifyCronHealth, type CronHealthClassifiableJob } from './cron-health.js';

const now = '2026-04-12T12:00:00.000Z';

const createJob = (overrides: Partial<CronHealthClassifiableJob> = {}): CronHealthClassifiableJob => ({
  attentionLevel: 'healthy',
  enabled: true,
  lastDeliveryError: null,
  lastError: null,
  lastFailedRunAt: null,
  lastRunAt: '2026-04-12T11:00:00.000Z',
  lastStatus: 'success',
  lastSuccessfulRunAt: '2026-04-12T11:00:00.000Z',
  latestOutputState: 'contentful',
  nextRunAt: '2026-04-12T13:00:00.000Z',
  noAgent: false,
  observedRunCount: 1,
  overdue: false,
  pausedAt: null,
  pausedReason: null,
  recentOutputCount: 1,
  scriptPath: null,
  state: 'scheduled',
  statusTone: 'healthy',
  ...overrides
});

describe('classifyCronHealth', () => {
  it('classifies disabled jobs first', () => {
    expect(
      classifyCronHealth(
        createJob({
          enabled: false,
          lastDeliveryError: 'delivery failed'
        }),
        { now }
      )
    ).toBe('disabled');
  });

  it('classifies paused jobs before delivery and run failures', () => {
    expect(
      classifyCronHealth(
        createJob({
          pausedReason: 'maintenance',
          lastDeliveryError: 'delivery failed',
          lastStatus: 'error'
        }),
        { now }
      )
    ).toBe('paused');
  });

  it('classifies delivery failures', () => {
    expect(
      classifyCronHealth(
        createJob({
          lastDeliveryError: 'message delivery failed'
        }),
        { now }
      )
    ).toBe('delivery-failed');
  });

  it('classifies last run failures from status, error text, or failed run timestamps', () => {
    expect(
      classifyCronHealth(
        createJob({
          lastStatus: 'error'
        }),
        { now }
      )
    ).toBe('failed-last-run');

    expect(
      classifyCronHealth(
        createJob({
          lastError: 'playbook failed',
          lastStatus: null
        }),
        { now }
      )
    ).toBe('failed-last-run');

    expect(
      classifyCronHealth(
        createJob({
          lastFailedRunAt: '2026-04-12T11:30:00.000Z',
          lastStatus: null,
          lastSuccessfulRunAt: '2026-04-12T10:00:00.000Z'
        }),
        { now }
      )
    ).toBe('failed-last-run');
  });

  it('classifies overdue jobs after stronger failures', () => {
    expect(
      classifyCronHealth(
        createJob({
          nextRunAt: '2026-04-12T11:00:00.000Z',
          lastStatus: 'success'
        }),
        { now }
      )
    ).toBe('overdue');
  });

  it('classifies enabled jobs with no observed run as never observed', () => {
    expect(
      classifyCronHealth(
        createJob({
          lastRunAt: null,
          lastStatus: null,
          lastSuccessfulRunAt: null,
          observedRunCount: 0,
          recentOutputCount: 0
        }),
        { now }
      )
    ).toBe('never-observed');
  });

  it('classifies safe no-agent silent script jobs as quiet expected', () => {
    expect(
      classifyCronHealth(
        createJob({
          latestOutputState: 'silent',
          noAgent: true,
          scriptPath: 'nightly-check.py'
        }),
        { now }
      )
    ).toBe('quiet-expected');
  });

  it('classifies successful jobs as healthy', () => {
    expect(classifyCronHealth(createJob(), { now })).toBe('healthy');
  });

  it('falls back to unknown when no health signal is decisive', () => {
    expect(
      classifyCronHealth(
        createJob({
          attentionLevel: 'muted',
          lastStatus: null,
          lastSuccessfulRunAt: null,
          latestOutputState: 'missing',
          recentOutputCount: 0,
          statusTone: 'muted'
        }),
        { now }
      )
    ).toBe('unknown');
  });
});
