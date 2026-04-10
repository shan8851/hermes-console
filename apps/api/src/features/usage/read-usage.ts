import { readHermesInstallation } from '@/features/inventory/read-installation';
import { createReadResult, type ReadResult } from '@/lib/read-result';
import { readStateDbSessionsResult } from '@/features/sessions/node-session-sources';
import type { AgentStateSessionRecord } from '@hermes-console/runtime';
import { summarizeUsageWindows } from '@hermes-console/runtime';
import type { HermesUsageSummary, UsageAgentSummary, UsageSessionRecord } from '@hermes-console/runtime';
import type { HermesQueryIssue } from '@hermes-console/runtime';

function toUsageRecord(agentId: string, agentLabel: string, session: AgentStateSessionRecord): UsageSessionRecord {
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
    costStatus: session.costStatus
  };
}

export function readHermesUsageResult(now = new Date()): ReadResult<HermesUsageSummary> {
  const installation = readHermesInstallation();
  const agents = installation.agents.filter((agent) => agent.presence.stateDb);
  const issues: HermesQueryIssue[] = [];
  const usageAgents: UsageAgentSummary[] = agents.map((agent) => ({
    id: agent.id,
    label: agent.label
  }));

  const records = agents.flatMap((agent) => {
    const stateSessions = readStateDbSessionsResult(agent.rootPath);
    issues.push(...stateSessions.issues);

    return stateSessions.data.map((session) => toUsageRecord(agent.id, agent.label, session));
  });

  return createReadResult({
    data: {
      loadedAt: now.toISOString(),
      agents: usageAgents,
      records,
      ...summarizeUsageWindows({
        records,
        now
      })
    },
    issues
  });
}
