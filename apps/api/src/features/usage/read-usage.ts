import { readHermesInstallation } from "@/features/inventory/read-installation";
import { createReadResult, type ReadResult } from "@/lib/read-result";
import { readStateDbSessionsResult } from "@/features/sessions/node-session-sources";
import type { AgentStateSessionRecord } from "@hermes-console/runtime";
import type { HermesUsageSummary, UsageBreakdownRow, UsageSessionRecord, UsageWindowId, UsageWindowSummary } from "@hermes-console/runtime";
import type { HermesQueryIssue } from "@hermes-console/runtime";

const WINDOWS: Array<{ id: UsageWindowId; label: string; days: number }> = [
  { id: "1d", label: "1 day", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
];

function normalizeEstimatedCost(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toUsageRecord(
  agentId: string,
  agentLabel: string,
  session: AgentStateSessionRecord,
): UsageSessionRecord {
  return {
    id: session.id,
    agentId,
    agentLabel,
    model: session.model,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    inputTokens: session.inputTokens,
    outputTokens: session.outputTokens,
    cacheReadTokens: session.cacheReadTokens,
    cacheWriteTokens: session.cacheWriteTokens,
    reasoningTokens: session.reasoningTokens,
    totalTokens:
      session.inputTokens +
      session.outputTokens +
      session.cacheReadTokens +
      session.cacheWriteTokens +
      session.reasoningTokens,
    estimatedCostUsd: session.estimatedCostUsd,
    costStatus: session.costStatus,
  };
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
    estimatedCostUsd: 0,
  };
}

function aggregateBreakdown(records: UsageSessionRecord[], pick: (record: UsageSessionRecord) => { key: string; label: string }) {
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

function summarizeWindow(window: { id: UsageWindowId; label: string; days: number }, records: UsageSessionRecord[], now: Date): UsageWindowSummary {
  const cutoffMs = now.getTime() - window.days * 24 * 60 * 60 * 1000;
  const filtered = records.filter((record) => new Date(record.startedAt).getTime() >= cutoffMs);

  const byModel = aggregateBreakdown(filtered, (record) => ({
    key: record.model ?? "unknown",
    label: record.model ?? "unknown",
  }));
  const byAgent = aggregateBreakdown(filtered, (record) => ({
    key: record.agentId,
    label: record.agentLabel,
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
    byAgent,
  };
}

export function readHermesUsageResult(
  now = new Date(),
): ReadResult<HermesUsageSummary> {
  const installation = readHermesInstallation();
  const agents = installation.agents.filter((agent) => agent.presence.stateDb);
  const issues: HermesQueryIssue[] = [];

  const records = agents.flatMap((agent) => {
    const stateSessions = readStateDbSessionsResult(agent.rootPath);
    issues.push(...stateSessions.issues);

    return stateSessions.data.map((session) =>
      toUsageRecord(agent.id, agent.label, session),
    );
  });

  return createReadResult({
    data: {
      loadedAt: now.toISOString(),
      windows: WINDOWS.map((window) => summarizeWindow(window, records, now)),
      availableWindows: WINDOWS.map((window) => window.id),
    },
    issues,
  });
}

export function readHermesUsage(now = new Date()): HermesUsageSummary {
  return readHermesUsageResult(now).data;
}
