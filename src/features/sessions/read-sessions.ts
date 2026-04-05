import type {
  AgentStateSessionRecord,
  HermesSessionSummary,
  MessagingSessionOrigin,
  MessagingSessionRecord,
  SessionAgentRef,
} from "@/features/sessions/types";

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function asOrigin(value: unknown): MessagingSessionOrigin | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const origin = value as Record<string, unknown>;

  return {
    platform: asString(origin.platform),
    chatId: asString(origin.chat_id),
    chatName: asString(origin.chat_name),
    chatType: asString(origin.chat_type),
    userId: asString(origin.user_id),
    userName: asString(origin.user_name),
    threadId: asString(origin.thread_id),
    chatTopic: asString(origin.chat_topic),
  };
}

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
  try {
    const parsed = JSON.parse(rawContent) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return [];
    }

    return Object.values(parsed as Record<string, unknown>)
      .map((value) => {
        if (!value || typeof value !== "object") {
          return null;
        }

        const record = value as Record<string, unknown>;
        const sessionId = asString(record.session_id);
        const sessionKey = asString(record.session_key);

        if (!sessionId || !sessionKey) {
          return null;
        }

        return {
          sessionId,
          sessionKey,
          createdAt: normalizeDateString(asString(record.created_at)),
          updatedAt: normalizeDateString(asString(record.updated_at)),
          displayName: asString(record.display_name),
          platform: asString(record.platform),
          chatType: asString(record.chat_type),
          totalTokens: asNumber(record.total_tokens),
          estimatedCostUsd: asNumber(record.estimated_cost_usd),
          costStatus: asString(record.cost_status),
          memoryFlushed: asBoolean(record.memory_flushed),
          origin: asOrigin(record.origin),
        } satisfies MessagingSessionRecord;
      })
      .filter((record): record is MessagingSessionRecord => Boolean(record))
      .sort((left, right) => {
        const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
        const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
        return rightTime - leftTime;
      });
  } catch {
    return [];
  }
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
} from "@/features/sessions/types";
