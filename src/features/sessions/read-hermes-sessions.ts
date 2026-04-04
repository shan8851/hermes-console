import { readHermesInstallation } from "@/features/inventory/read-installation";
import {
  applyCronJobNames,
  combineAgentSessions,
  type SessionAgentRef,
  type HermesSessionsIndex,
} from "@/features/sessions/read-sessions";
import { readMessagingSessions, readStateDbSessions } from "@/features/sessions/node-session-sources";
import { readCronJobIndex } from "@/features/sessions/read-cron-job-index";

function compareByLastActivity(left: { lastActivityAt: string }, right: { lastActivityAt: string }) {
  return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
}

export function readHermesSessions(): HermesSessionsIndex {
  const installation = readHermesInstallation();
  const agents = installation.agents.filter((agent) => agent.presence.stateDb);

  const sessions = agents
    .flatMap((agent) => {
      const agentRef: SessionAgentRef = {
        id: agent.id,
        label: agent.label,
        rootPath: agent.rootPath,
        source: agent.source,
      };

      return applyCronJobNames({
        sessions: combineAgentSessions({
          agent: agentRef,
          stateSessions: readStateDbSessions(agent.rootPath),
          messagingSessions: readMessagingSessions(agent.rootPath),
        }),
        cronJobs: readCronJobIndex(agent.rootPath),
      });
    })
    .sort(compareByLastActivity);

  return {
    sessions,
    agentCount: installation.agents.length,
    agentsWithSessions: new Set(sessions.map((session) => session.agentId)).size,
  };
}
