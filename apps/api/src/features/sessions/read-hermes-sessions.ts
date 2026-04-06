import { readHermesInstallation } from "@/features/inventory/read-installation";
import {
  applyCronJobNames,
  combineAgentSessions,
  type SessionAgentRef,
  type HermesSessionsIndex,
} from "@/features/sessions/read-sessions";
import {
  readMessagingSessionsResult,
  readStateDbSessionsResult,
} from "@/features/sessions/node-session-sources";
import { readCronJobIndexResult } from "@/features/sessions/read-cron-job-index";
import { createReadResult, type ReadResult } from "@/lib/read-result";
import type { HermesQueryIssue } from "@hermes-console/runtime";

function compareByLastActivity(left: { lastActivityAt: string }, right: { lastActivityAt: string }) {
  return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
}

export function readHermesSessionsResult(): ReadResult<HermesSessionsIndex> {
  const installation = readHermesInstallation();
  const agents = installation.agents.filter((agent) => agent.presence.stateDb);
  const issues: HermesQueryIssue[] = [];

  const sessions = agents
    .flatMap((agent) => {
      const agentRef: SessionAgentRef = {
        id: agent.id,
        label: agent.label,
        rootPath: agent.rootPath,
        source: agent.source,
      };

      const stateSessions = readStateDbSessionsResult(agent.rootPath);
      const messagingSessions = readMessagingSessionsResult(agent.rootPath);
      const cronJobs = readCronJobIndexResult(agent.rootPath);

      issues.push(
        ...stateSessions.issues,
        ...messagingSessions.issues,
        ...cronJobs.issues,
      );

      return applyCronJobNames({
        sessions: combineAgentSessions({
          agent: agentRef,
          stateSessions: stateSessions.data,
          messagingSessions: messagingSessions.data,
        }),
        cronJobs: cronJobs.data,
      });
    })
    .sort(compareByLastActivity);

  return createReadResult({
    data: {
      sessions,
      agentCount: installation.agents.length,
      agentsWithSessions: new Set(sessions.map((session) => session.agentId)).size,
    },
    issues,
  });
}

export function readHermesSessions(): HermesSessionsIndex {
  return readHermesSessionsResult().data;
}
