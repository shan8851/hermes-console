import { readHermesSessions } from "@/features/sessions/read-hermes-sessions";
import { buildSessionDetail } from "@/features/sessions/read-sessions";
import { readStateDbMessages } from "@/features/sessions/node-session-sources";

export function readHermesSessionDetail({
  agentId,
  sessionId,
}: {
  agentId: string;
  sessionId: string;
}) {
  const index = readHermesSessions();
  const summary = index.sessions.find(
    (session) => session.agentId === agentId && session.sessionId === sessionId,
  );

  if (!summary) {
    return null;
  }

  const messages = readStateDbMessages({
    agentRootPath: summary.agentRootPath,
    sessionId,
  });

  return buildSessionDetail({
    summary,
    messages,
  });
}
