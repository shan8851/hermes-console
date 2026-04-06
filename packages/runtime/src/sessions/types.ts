import { z } from "zod";

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

export type MessagingSessionOriginSource = {
  platform?: string | null | undefined;
  chat_id?: string | null | undefined;
  chat_name?: string | null | undefined;
  chat_type?: string | null | undefined;
  user_id?: string | null | undefined;
  user_name?: string | null | undefined;
  thread_id?: string | null | undefined;
  chat_topic?: string | null | undefined;
};

export type MessagingSessionRecordSource = {
  session_key: string;
  session_id: string;
  created_at?: string | null | undefined;
  updated_at?: string | null | undefined;
  display_name?: string | null | undefined;
  platform?: string | null | undefined;
  chat_type?: string | null | undefined;
  total_tokens?: number | null | undefined;
  estimated_cost_usd?: number | null | undefined;
  cost_status?: string | null | undefined;
  memory_flushed?: boolean | null | undefined;
  origin?: MessagingSessionOriginSource | null | undefined;
};

export type MessagingSessionIndexSource = Record<
  string,
  MessagingSessionRecordSource
>;

export const sessionAgentRefSchema = z.object({
  id: z.string(),
  label: z.string(),
  rootPath: z.string(),
  source: z.enum(["root", "profile"]),
});

export const messagingSessionOriginSchema = z.object({
  platform: z.string().nullable(),
  chatId: z.string().nullable(),
  chatName: z.string().nullable(),
  chatType: z.string().nullable(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  threadId: z.string().nullable(),
  chatTopic: z.string().nullable(),
});

export const messagingSessionOriginSourceSchema = z.object({
  platform: z.string().nullable().optional(),
  chat_id: z.string().nullable().optional(),
  chat_name: z.string().nullable().optional(),
  chat_type: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  user_name: z.string().nullable().optional(),
  thread_id: z.string().nullable().optional(),
  chat_topic: z.string().nullable().optional(),
});

export const messagingSessionRecordSchema = z.object({
  sessionKey: z.string(),
  sessionId: z.string(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  displayName: z.string().nullable(),
  platform: z.string().nullable(),
  chatType: z.string().nullable(),
  totalTokens: z.number().nullable(),
  estimatedCostUsd: z.number().nullable(),
  costStatus: z.string().nullable(),
  memoryFlushed: z.boolean().nullable(),
  origin: messagingSessionOriginSchema.nullable(),
});

export const messagingSessionRecordSourceSchema = z.object({
  session_key: z.string(),
  session_id: z.string(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  chat_type: z.string().nullable().optional(),
  total_tokens: z.number().nullable().optional(),
  estimated_cost_usd: z.number().nullable().optional(),
  cost_status: z.string().nullable().optional(),
  memory_flushed: z.boolean().nullable().optional(),
  origin: messagingSessionOriginSourceSchema.nullable().optional(),
});

export const messagingSessionIndexSourceSchema = z.record(
  z.string(),
  messagingSessionRecordSourceSchema,
);

export const agentStateSessionRecordSchema = z.object({
  id: z.string(),
  source: z.string().nullable(),
  userId: z.string().nullable(),
  model: z.string().nullable(),
  parentSessionId: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  endReason: z.string().nullable(),
  messageCount: z.number(),
  toolCallCount: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  estimatedCostUsd: z.number().nullable(),
  actualCostUsd: z.number().nullable(),
  costStatus: z.string().nullable(),
  title: z.string().nullable(),
});

export const agentSessionMessageRecordSchema = z.object({
  id: z.number(),
  sessionId: z.string(),
  role: z.string(),
  content: z.string().nullable(),
  toolName: z.string().nullable(),
  timestamp: z.string(),
  tokenCount: z.number().nullable(),
});

export const hermesSessionSummarySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentLabel: z.string(),
  agentSource: z.enum(["root", "profile"]),
  agentRootPath: z.string(),
  sessionId: z.string(),
  sessionKey: z.string().nullable(),
  source: z.string().nullable(),
  sourceLabel: z.string(),
  title: z.string(),
  displayName: z.string().nullable(),
  platform: z.string().nullable(),
  chatType: z.string().nullable(),
  model: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  lastActivityAt: z.string(),
  messageCount: z.number(),
  toolCallCount: z.number(),
  totalTokens: z.number(),
  estimatedCostUsd: z.number().nullable(),
  costStatus: z.string().nullable(),
  memoryFlushed: z.boolean().nullable(),
  hasMessagingMetadata: z.boolean(),
  cronJobId: z.string().nullable(),
  cronJobName: z.string().nullable(),
});

export const hermesSessionsIndexSchema = z.object({
  sessions: z.array(hermesSessionSummarySchema),
  agentCount: z.number(),
  agentsWithSessions: z.number(),
});
