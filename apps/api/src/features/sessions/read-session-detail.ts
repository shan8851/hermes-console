import path from 'node:path';

import { readHermesInstallationResult } from '@/features/inventory/read-installation';
import { readCronJobIndexResult } from '@/features/sessions/read-cron-job-index';
import { applyCronJobNames, combineAgentSessions, type SessionAgentRef } from '@/features/sessions/read-sessions';
import {
  readMessagingSessionsResult,
  readStateDbBoundedMessagesResult,
  readStateDbSessionsResult
} from '@/features/sessions/node-session-sources';
import { createReadResult, type ReadResult } from '@/lib/read-result';
import type {
  AgentSessionMessageRecord,
  AgentStateSessionRecord,
  HermesQueryIssue,
  SessionDetail,
  SessionMessage,
  SessionToolCallSummary
} from '@hermes-console/runtime';

const TRANSCRIPT_HEAD_MESSAGE_COUNT = 50;
const TRANSCRIPT_TAIL_MESSAGE_COUNT = 200;
const MESSAGE_CONTENT_PREVIEW_LENGTH = 6_000;
const TOOL_ARGUMENT_PREVIEW_LENGTH = 320;

const truncatePreview = (value: string): string =>
  value.length > TOOL_ARGUMENT_PREVIEW_LENGTH ? `${value.slice(0, TOOL_ARGUMENT_PREVIEW_LENGTH)}...` : value;

const stableStringify = (value: unknown): string | null => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const readStringProperty = ({ key, value }: { key: string; value: unknown }): string | null => {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return null;
  }

  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === 'string' ? entry : null;
};

const readNestedFunction = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || !('function' in value)) {
    return null;
  }

  return value.function;
};

const readToolCallName = (value: unknown): string | null => {
  const directName = readStringProperty({
    key: 'name',
    value
  });

  if (directName) {
    return directName;
  }

  return readStringProperty({
    key: 'name',
    value: readNestedFunction(value)
  });
};

const readToolCallArgumentsPreview = (value: unknown): string | null => {
  const directArguments = readStringProperty({
    key: 'arguments',
    value
  });
  const nestedArguments = readStringProperty({
    key: 'arguments',
    value: readNestedFunction(value)
  });
  const argumentsValue = directArguments ?? nestedArguments;

  if (argumentsValue) {
    return truncatePreview(argumentsValue);
  }

  const serializedValue = stableStringify(value);
  return serializedValue ? truncatePreview(serializedValue) : null;
};

const summarizeToolCall = (value: unknown): SessionToolCallSummary => ({
  id: readStringProperty({ key: 'id', value }),
  name: readToolCallName(value),
  argumentsPreview: readToolCallArgumentsPreview(value)
});

const parseToolCallSummaries = (rawToolCalls: string | null): SessionToolCallSummary[] => {
  if (!rawToolCalls) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawToolCalls) as unknown;
    const toolCalls = Array.isArray(parsed) ? parsed : [parsed];

    return toolCalls.map(summarizeToolCall);
  } catch {
    return [
      {
        id: null,
        name: null,
        argumentsPreview: truncatePreview(rawToolCalls)
      }
    ];
  }
};

const truncateMessageContent = (
  content: string | null
): {
  content: string | null;
  contentOmittedCharCount: number;
} => {
  if (content == null || content.length <= MESSAGE_CONTENT_PREVIEW_LENGTH) {
    return {
      content,
      contentOmittedCharCount: 0
    };
  }

  return {
    content: content.slice(0, MESSAGE_CONTENT_PREVIEW_LENGTH),
    contentOmittedCharCount: content.length - MESSAGE_CONTENT_PREVIEW_LENGTH
  };
};

const toSessionMessage = (message: AgentSessionMessageRecord): SessionMessage => {
  const truncatedContent = truncateMessageContent(message.content);

  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: truncatedContent.content,
    contentCharCount: message.contentCharCount,
    contentOmittedCharCount: truncatedContent.contentOmittedCharCount,
    toolCallId: message.toolCallId,
    toolCalls: parseToolCallSummaries(message.toolCallsJson),
    toolName: message.toolName,
    finishReason: message.finishReason,
    timestamp: message.timestamp,
    tokenCount: message.tokenCount
  };
};

const createTranscriptSummary = ({
  messages,
  omittedMessageCount,
  totalContentCharCount,
  totalMessageCount
}: {
  messages: SessionMessage[];
  omittedMessageCount: number;
  totalContentCharCount: number;
  totalMessageCount: number;
}): SessionDetail['transcript'] => {
  const returnedContentCharCount = messages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);

  return {
    totalMessageCount,
    returnedMessageCount: messages.length,
    omittedMessageCount,
    contentCharCount: totalContentCharCount,
    returnedContentCharCount,
    omittedContentCharCount: Math.max(totalContentCharCount - returnedContentCharCount, 0),
    messageHeadCount: TRANSCRIPT_HEAD_MESSAGE_COUNT,
    messageTailCount: TRANSCRIPT_TAIL_MESSAGE_COUNT,
    maxMessageContentChars: MESSAGE_CONTENT_PREVIEW_LENGTH
  };
};

const createEmptyTranscriptSummary = (): SessionDetail['transcript'] => ({
  totalMessageCount: 0,
  returnedMessageCount: 0,
  omittedMessageCount: 0,
  contentCharCount: 0,
  returnedContentCharCount: 0,
  omittedContentCharCount: 0,
  messageHeadCount: TRANSCRIPT_HEAD_MESSAGE_COUNT,
  messageTailCount: TRANSCRIPT_TAIL_MESSAGE_COUNT,
  maxMessageContentChars: MESSAGE_CONTENT_PREVIEW_LENGTH
});

const toSessionMessages = (messages: AgentSessionMessageRecord[]): SessionMessage[] => messages.map(toSessionMessage);

const createMessagesTranscriptSummary = ({
  boundedMessages
}: {
  boundedMessages: ReturnType<typeof readStateDbBoundedMessagesResult>['data'];
}): {
  messages: SessionMessage[];
  transcript: SessionDetail['transcript'];
} => {
  const messages = toSessionMessages(boundedMessages.messages);

  return {
    messages,
    transcript: createTranscriptSummary({
      messages,
      omittedMessageCount: boundedMessages.omittedMessageCount,
      totalContentCharCount: boundedMessages.contentCharCount,
      totalMessageCount: boundedMessages.totalMessageCount
    })
  };
};

const createFallbackMessagesTranscriptSummary = (): {
  messages: SessionMessage[];
  transcript: SessionDetail['transcript'];
} => ({
  messages: [],
  transcript: createEmptyTranscriptSummary()
});

const calculateDurationMs = ({ endedAt, startedAt }: { endedAt: string | null; startedAt: string }): number | null => {
  if (!endedAt) {
    return null;
  }

  const startedTime = new Date(startedAt).getTime();
  const endedTime = new Date(endedAt).getTime();

  if (Number.isNaN(startedTime) || Number.isNaN(endedTime)) {
    return null;
  }

  return Math.max(0, endedTime - startedTime);
};

const createTranscriptEmptyIssue = ({
  agentId,
  agentRootPath,
  sessionId
}: {
  agentId: string;
  agentRootPath: string;
  sessionId: string;
}): HermesQueryIssue => ({
  id: `sessions-detail-transcript-empty-${agentId}-${sessionId}`,
  code: 'missing_path',
  severity: 'info',
  summary: 'Session transcript rows were not returned',
  detail:
    'The selected session has transcript-backed metadata, but Hermes Console did not receive message rows for it. The transcript panel is left empty instead of failing the page.',
  path: path.join(agentRootPath, 'state.db')
});

const createSessionDetail = ({
  messages,
  transcript,
  session,
  stateSession
}: {
  messages: SessionMessage[];
  transcript: SessionDetail['transcript'];
  session: SessionDetail['session'];
  stateSession: AgentStateSessionRecord | null;
}): SessionDetail => {
  const inputTokens = stateSession?.inputTokens ?? 0;
  const outputTokens = stateSession?.outputTokens ?? 0;
  const cacheReadTokens = stateSession?.cacheReadTokens ?? 0;
  const cacheWriteTokens = stateSession?.cacheWriteTokens ?? 0;
  const reasoningTokens = stateSession?.reasoningTokens ?? 0;

  return {
    session,
    messages,
    transcript,
    stats: {
      durationMs: calculateDurationMs({
        startedAt: session.startedAt,
        endedAt: session.endedAt
      }),
      messageCount: session.messageCount,
      toolCallCount: session.toolCallCount,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      reasoningTokens,
      totalTokens: session.totalTokens,
      estimatedCostUsd: session.estimatedCostUsd,
      actualCostUsd: stateSession?.actualCostUsd ?? null
    },
    lineage: {
      parentSessionId: stateSession?.parentSessionId ?? null
    }
  };
};

export function readHermesSessionDetail({
  agentId,
  sessionId
}: {
  agentId: string;
  sessionId: string;
}): ReadResult<SessionDetail> | null {
  const installation = readHermesInstallationResult();
  const agent = installation.data.agents.find((entry) => entry.id === agentId);

  if (!agent) {
    return null;
  }

  const agentRef: SessionAgentRef = {
    id: agent.id,
    label: agent.label,
    rootPath: agent.rootPath,
    source: agent.source
  };
  const stateSessions = readStateDbSessionsResult(agent.rootPath);
  const messagingSessions = readMessagingSessionsResult(agent.rootPath);
  const cronJobs = readCronJobIndexResult(agent.rootPath);
  const sessions = applyCronJobNames({
    sessions: combineAgentSessions({
      agent: agentRef,
      stateSessions: stateSessions.data,
      messagingSessions: messagingSessions.data
    }),
    cronJobs: cronJobs.data
  });
  const session = sessions.find((entry) => entry.sessionId === sessionId);

  if (!session) {
    return null;
  }

  const messages = readStateDbBoundedMessagesResult({
    agentRootPath: agent.rootPath,
    messageHeadCount: TRANSCRIPT_HEAD_MESSAGE_COUNT,
    messageTailCount: TRANSCRIPT_TAIL_MESSAGE_COUNT,
    sessionId
  });
  const transcriptSummary =
    messages.issues.length === 0
      ? createMessagesTranscriptSummary({
          boundedMessages: messages.data
        })
      : createFallbackMessagesTranscriptSummary();
  const stateSession = stateSessions.data.find((entry) => entry.id === sessionId) ?? null;
  const transcriptIssues =
    session.hasStateTranscript &&
    session.messageCount > 0 &&
    transcriptSummary.messages.length === 0 &&
    messages.issues.length === 0
      ? [
          createTranscriptEmptyIssue({
            agentId,
            agentRootPath: agent.rootPath,
            sessionId
          })
        ]
      : [];

  return createReadResult({
    data: createSessionDetail({
      messages: transcriptSummary.messages,
      transcript: transcriptSummary.transcript,
      session,
      stateSession
    }),
    issues: [
      ...installation.issues,
      ...stateSessions.issues,
      ...messagingSessions.issues,
      ...cronJobs.issues,
      ...messages.issues,
      ...transcriptIssues
    ]
  });
}
