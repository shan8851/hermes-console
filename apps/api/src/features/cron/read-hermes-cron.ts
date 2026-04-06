import { readHermesInstallation } from "@/features/inventory/read-installation";
import {
  readCronJobsFileResult,
  readCronOutputHistoryResult,
} from "@/features/cron/node-cron-sources";
import { normalizeCronJobs } from "@/features/cron/read-cron";
import { createReadResult, type ReadResult } from "@/lib/read-result";
import { readStateDbSessionsResult } from "@/features/sessions/node-session-sources";
import type { AgentStateSessionRecord } from "@hermes-console/runtime";
import type { CronAgentRef, CronObservedRunRecord, HermesCronIndex } from "@hermes-console/runtime";
import type { HermesQueryIssue } from "@hermes-console/runtime";

function compareCronJobs(left: { nextRunAt: string | null; createdAt: string | null }, right: { nextRunAt: string | null; createdAt: string | null }) {
  const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : right.createdAt ? new Date(right.createdAt).getTime() : 0;
  return leftTime - rightTime;
}

function inferCronJobId(sessionId: string) {
  const match = sessionId.match(/^cron_([a-f0-9]+)_/i);
  return match?.[1] ?? null;
}

function buildObservedRunsByJobId(stateSessions: AgentStateSessionRecord[]) {
  const runsByJobId = new Map<string, CronObservedRunRecord[]>();

  for (const session of stateSessions) {
    if (session.source !== "cron") {
      continue;
    }

    const jobId = inferCronJobId(session.id);
    if (!jobId) {
      continue;
    }

    const durationMs =
      session.endedAt != null ? Math.max(0, new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) : null;

    const run: CronObservedRunRecord = {
      id: session.id,
      jobId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMs,
      success: session.endReason === "cron_complete",
    };

    const existing = runsByJobId.get(jobId) ?? [];
    existing.push(run);
    runsByJobId.set(jobId, existing);
  }

  return runsByJobId;
}

export function readHermesCronResult(): ReadResult<HermesCronIndex> {
  const installation = readHermesInstallation();
  const agents = installation.agents.filter((agent) => agent.presence.cron);
  const issues: HermesQueryIssue[] = [];

  const jobs = agents
    .flatMap((agent) => {
      const agentRef: CronAgentRef = {
        id: agent.id,
        label: agent.label,
        rootPath: agent.rootPath,
        source: agent.source,
      };

      const rawJobs = readCronJobsFileResult(agent.rootPath);
      const outputsByJobId = readCronOutputHistoryResult(agent.rootPath);
      const runsByJobId = readStateDbSessionsResult(agent.rootPath);

      issues.push(
        ...rawJobs.issues,
        ...outputsByJobId.issues,
        ...runsByJobId.issues,
      );

      return normalizeCronJobs({
        agent: agentRef,
        rawJobs: rawJobs.data,
        outputsByJobId: outputsByJobId.data,
        runsByJobId: buildObservedRunsByJobId(runsByJobId.data),
      });
    })
    .sort(compareCronJobs);

  return createReadResult({
    data: {
      jobs,
      agentCount: installation.agents.length,
      agentsWithCron: new Set(jobs.map((job) => job.agentId)).size,
    },
    issues,
  });
}

export function readHermesCron(): HermesCronIndex {
  return readHermesCronResult().data;
}
