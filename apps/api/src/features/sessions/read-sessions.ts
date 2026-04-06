import type {
  AgentStateSessionRecord,
  HermesSessionSummary,
  MessagingSessionRecordSource,
  MessagingSessionRecord,
  SessionAgentRef,
} from "@hermes-console/runtime";
import { messagingSessionIndexSourceSchema } from "@hermes-console/runtime";

function normalizeDateString(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createTitle({
  stateTitle,
  displayName,
  sessionId,
}: {
  stateTitle: string | null;
  displayName: string | null;
  sessionId: string;
}) {
  if (stateTitle?.trim()) {
    return stateTitle.trim();
  }

  if (displayName?.trim()) {
    return displayName.trim();
  }

  return sessionId;
}

function compareByLastActivity(left: HermesSessionSummary, right: HermesSessionSummary) {
  return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
}

function inferCronJobId(sessionId: string) {
  const match = sessionId.match(/^cron_([a-f0-9]+)_/i);
  return match?.[1] ?? null;
}

function createSourceLabel({
  source,
  platform,
  chatType,
}: {
  source: string | null;
  platform: string | null;
  chatType: string | null;
}) {
  if (source === "cron") {
    return "cron";
  }

  if (source === "cli") {
    return "cli";
  }

  if (platform && chatType) {
    return `${platform} ${chatType}`;
  }

  if (platform) {
    return platform;
  }

  if (source) {
    return source;
  }

  return "unknown";
}

function resolveTotalTokens({
  stateSession,
  messaging,
}: {
  stateSession: AgentStateSessionRecord;
  messaging: MessagingSessionRecord | null;
}) {
  const stateTotal =
    stateSession.inputTokens +
    stateSession.outputTokens +
    stateSession.cacheReadTokens +
    stateSession.cacheWriteTokens +
    stateSession.reasoningTokens;

  if (typeof messaging?.totalTokens === "number" && messaging.totalTokens > 0) {
    return messaging.totalTokens;
  }

  return stateTotal;
}

export function parseMessagingSessionIndex(rawContent: string): MessagingSessionRecord[] {
  const parsed = messagingSessionIndexSourceSchema.parse(
    JSON.parse(rawContent),
  );

  return Object.values(parsed)
    .map((record: MessagingSessionRecordSource) => ({
      sessionId: record.session_id,
      sessionKey: record.session_key,
      createdAt: normalizeDateString(record.created_at ?? null),
      updatedAt: normalizeDateString(record.updated_at ?? null),
      displayName: record.display_name ?? null,
      platform: record.platform ?? null,
      chatType: record.chat_type ?? null,
      totalTokens: record.total_tokens ?? null,
      estimatedCostUsd: record.estimated_cost_usd ?? null,
      costStatus: record.cost_status ?? null,
      memoryFlushed: record.memory_flushed ?? null,
      origin: record.origin
        ? {
            platform: record.origin.platform ?? null,
            chatId: record.origin.chat_id ?? null,
            chatName: record.origin.chat_name ?? null,
            chatType: record.origin.chat_type ?? null,
            userId: record.origin.user_id ?? null,
            userName: record.origin.user_name ?? null,
            threadId: record.origin.thread_id ?? null,
            chatTopic: record.origin.chat_topic ?? null,
          }
        : null,
    }))
    .sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export function combineAgentSessions({
  agent,
  stateSessions,
  messagingSessions,
}: {
  agent: SessionAgentRef;
  stateSessions: AgentStateSessionRecord[];
  messagingSessions: MessagingSessionRecord[];
}): HermesSessionSummary[] {
  const messagingBySessionId = new Map(messagingSessions.map((record) => [record.sessionId, record]));

  return stateSessions
    .map((stateSession) => {
      const messaging = messagingBySessionId.get(stateSession.id) ?? null;
      const lastActivityAt = messaging?.updatedAt ?? stateSession.endedAt ?? stateSession.startedAt;

      const cronJobId = inferCronJobId(stateSession.id);
      return {
        id: `${agent.id}:${stateSession.id}`,
        agentId: agent.id,
        agentLabel: agent.label,
        agentSource: agent.source,
        agentRootPath: agent.rootPath,
        sessionId: stateSession.id,
        sessionKey: messaging?.sessionKey ?? null,
        source: stateSession.source,
        sourceLabel: createSourceLabel({
          source: stateSession.source,
          platform: messaging?.platform ?? null,
          chatType: messaging?.chatType ?? null,
        }),
        title: createTitle({
          stateTitle: stateSession.title,
          displayName: messaging?.displayName ?? null,
          sessionId: stateSession.id,
        }),
        displayName: messaging?.displayName ?? null,
        platform: messaging?.platform ?? null,
        chatType: messaging?.chatType ?? null,
        model: stateSession.model,
        startedAt: stateSession.startedAt,
        endedAt: stateSession.endedAt,
        lastActivityAt,
        messageCount: stateSession.messageCount,
        toolCallCount: stateSession.toolCallCount,
        totalTokens: resolveTotalTokens({ stateSession, messaging }),
        estimatedCostUsd: messaging?.estimatedCostUsd ?? stateSession.estimatedCostUsd,
        costStatus: messaging?.costStatus ?? stateSession.costStatus,
        memoryFlushed: messaging?.memoryFlushed ?? null,
        hasMessagingMetadata: Boolean(messaging),
        cronJobId,
        cronJobName: null,
      } satisfies HermesSessionSummary;
    })
    .sort(compareByLastActivity);
}

export function applyCronJobNames({
  sessions,
  cronJobs,
}: {
  sessions: HermesSessionSummary[];
  cronJobs: Array<{ id: string; name: string | null }>;
}) {
  const cronJobNames = new Map(cronJobs.map((job) => [job.id, job.name]));

  return sessions.map((session) => {
    if (!session.cronJobId) {
      return session;
    }

    const cronJobName = cronJobNames.get(session.cronJobId) ?? null;

    if (!cronJobName) {
      return session;
    }

    return {
      ...session,
      title: session.title === session.sessionId ? cronJobName : session.title,
      cronJobName,
    } satisfies HermesSessionSummary;
  });
}

export type {
  AgentStateSessionRecord,
  HermesSessionSummary,
  HermesSessionsIndex,
  MessagingSessionRecord,
  SessionAgentRef,
} from "@hermes-console/runtime";
