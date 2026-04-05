export type SessionAgentRef = {
  id: string;
  label: string;
  rootPath: string;
  source: "root" | "profile";
};

export type MessagingSessionOrigin = {
  platform: string | null;
  chatId: string | null;
  chatName: string | null;
  chatType: string | null;
  userId: string | null;
  userName: string | null;
  threadId: string | null;
  chatTopic: string | null;
};

export type MessagingSessionRecord = {
  sessionKey: string;
  sessionId: string;
  createdAt: string | null;
  updatedAt: string | null;
  displayName: string | null;
  platform: string | null;
  chatType: string | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  costStatus: string | null;
  memoryFlushed: boolean | null;
  origin: MessagingSessionOrigin | null;
};

export type AgentStateSessionRecord = {
  id: string;
  source: string | null;
  userId: string | null;
  model: string | null;
  parentSessionId: string | null;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
  messageCount: number;
  toolCallCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  costStatus: string | null;
  title: string | null;
};

export type AgentSessionMessageRecord = {
  id: number;
  sessionId: string;
  role: string;
  content: string | null;
  toolName: string | null;
  timestamp: string;
  tokenCount: number | null;
};

export type HermesSessionSummary = {
  id: string;
  agentId: string;
  agentLabel: string;
  agentSource: "root" | "profile";
  agentRootPath: string;
  sessionId: string;
  sessionKey: string | null;
  source: string | null;
  sourceLabel: string;
  title: string;
  displayName: string | null;
  platform: string | null;
  chatType: string | null;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
  lastActivityAt: string;
  messageCount: number;
  toolCallCount: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
  costStatus: string | null;
  memoryFlushed: boolean | null;
  hasMessagingMetadata: boolean;
  cronJobId: string | null;
  cronJobName: string | null;
};

export type HermesSessionsIndex = {
  sessions: HermesSessionSummary[];
  agentCount: number;
  agentsWithSessions: number;
};

