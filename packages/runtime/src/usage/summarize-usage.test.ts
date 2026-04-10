import { describe, expect, it } from 'vitest';

import type { UsageSessionRecord } from './types.js';
import { summarizeUsageWindow, summarizeUsageWindows } from './summarize-usage.js';

const records: UsageSessionRecord[] = [
  {
    id: 'session-default-new',
    agentId: 'default',
    agentLabel: 'Default',
    model: 'gpt-5',
    startedAt: '2026-04-10T08:00:00.000Z',
    endedAt: '2026-04-10T09:00:00.000Z',
    inputTokens: 100,
    outputTokens: 40,
    cacheReadTokens: 10,
    cacheWriteTokens: 5,
    reasoningTokens: 20,
    totalTokens: 175,
    estimatedCostUsd: 1.25,
    costStatus: 'estimated'
  },
  {
    id: 'session-alpha-new',
    agentId: 'alpha',
    agentLabel: 'alpha',
    model: 'gpt-5-mini',
    startedAt: '2026-04-09T10:00:00.000Z',
    endedAt: '2026-04-09T10:30:00.000Z',
    inputTokens: 80,
    outputTokens: 20,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 10,
    totalTokens: 110,
    estimatedCostUsd: 0.4,
    costStatus: 'estimated'
  },
  {
    id: 'session-old',
    agentId: 'default',
    agentLabel: 'Default',
    model: 'gpt-4.1',
    startedAt: '2026-03-01T12:00:00.000Z',
    endedAt: '2026-03-01T12:30:00.000Z',
    inputTokens: 50,
    outputTokens: 25,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    totalTokens: 75,
    estimatedCostUsd: 0.2,
    costStatus: 'estimated'
  }
];

describe('summarizeUsageWindow', () => {
  it('summarizes usage within the selected window', () => {
    const summary = summarizeUsageWindow({
      records,
      windowId: '7d',
      now: new Date('2026-04-10T12:00:00.000Z')
    });

    expect(summary.sessionCount).toBe(2);
    expect(summary.totalTokens).toBe(285);
    expect(summary.topAgent?.key).toBe('default');
    expect(summary.topModel?.key).toBe('gpt-5');
  });

  it('returns all configured windows in order', () => {
    const summary = summarizeUsageWindows({
      records,
      now: new Date('2026-04-10T12:00:00.000Z')
    });

    expect(summary.availableWindows).toEqual(['1d', '7d', '30d']);
    expect(summary.windows.map((window) => window.id)).toEqual(['1d', '7d', '30d']);
  });
});
