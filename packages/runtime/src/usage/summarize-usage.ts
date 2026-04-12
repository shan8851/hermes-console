import type { UsageBreakdownRow, UsageSessionRecord, UsageWindowId, UsageWindowSummary } from './types.js';

export const usageWindowDefinitions: Array<{ id: UsageWindowId; label: string; days: number }> = [
  { id: '1d', label: '1 day', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 }
];

function normalizeEstimatedCost(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function createEmptyBreakdownRow(key: string, label: string): UsageBreakdownRow {
  return {
    key,
    label,
    sessions: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0
  };
}

function aggregateBreakdown(
  records: UsageSessionRecord[],
  pick: (record: UsageSessionRecord) => { key: string; label: string }
) {
  const buckets = new Map<string, UsageBreakdownRow>();

  for (const record of records) {
    const bucketKey = pick(record);
    const row = buckets.get(bucketKey.key) ?? createEmptyBreakdownRow(bucketKey.key, bucketKey.label);
    row.sessions += 1;
    row.inputTokens += record.inputTokens;
    row.outputTokens += record.outputTokens;
    row.cacheReadTokens += record.cacheReadTokens;
    row.cacheWriteTokens += record.cacheWriteTokens;
    row.reasoningTokens += record.reasoningTokens;
    row.totalTokens += record.totalTokens;
    row.estimatedCostUsd += normalizeEstimatedCost(record.estimatedCostUsd);
    buckets.set(bucketKey.key, row);
  }

  return Array.from(buckets.values()).sort((left, right) => right.totalTokens - left.totalTokens);
}

export function summarizeUsageWindow({
  records,
  windowId,
  now
}: {
  records: UsageSessionRecord[];
  windowId: UsageWindowId;
  now: Date;
}): UsageWindowSummary {
  const window = usageWindowDefinitions.find((candidate) => candidate.id === windowId) ?? usageWindowDefinitions[0]!;
  const cutoffMs = now.getTime() - window.days * 24 * 60 * 60 * 1000;
  const filtered = records.filter((record) => new Date(record.startedAt).getTime() >= cutoffMs);
  const byModel = aggregateBreakdown(filtered, (record) => ({
    key: record.model ?? 'unknown',
    label: record.model ?? 'unknown'
  }));
  const byAgent = aggregateBreakdown(filtered, (record) => ({
    key: record.agentId,
    label: record.agentLabel
  }));

  return {
    id: window.id,
    label: window.label,
    days: window.days,
    sessionCount: filtered.length,
    inputTokens: filtered.reduce((sum, record) => sum + record.inputTokens, 0),
    outputTokens: filtered.reduce((sum, record) => sum + record.outputTokens, 0),
    cacheReadTokens: filtered.reduce((sum, record) => sum + record.cacheReadTokens, 0),
    cacheWriteTokens: filtered.reduce((sum, record) => sum + record.cacheWriteTokens, 0),
    reasoningTokens: filtered.reduce((sum, record) => sum + record.reasoningTokens, 0),
    totalTokens: filtered.reduce((sum, record) => sum + record.totalTokens, 0),
    estimatedCostUsd: filtered.reduce((sum, record) => sum + normalizeEstimatedCost(record.estimatedCostUsd), 0),
    topModel: byModel[0] ?? null,
    topAgent: byAgent[0] ?? null,
    byModel,
    byAgent
  };
}

export function summarizeUsageWindows({ records, now }: { records: UsageSessionRecord[]; now: Date }) {
  return {
    windows: usageWindowDefinitions.map((window) =>
      summarizeUsageWindow({
        records,
        windowId: window.id,
        now
      })
    ),
    availableWindows: usageWindowDefinitions.map((window) => window.id)
  };
}
