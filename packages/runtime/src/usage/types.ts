import { z } from "zod";

export type UsageWindowId = "1d" | "7d" | "30d";

export type UsageSessionRecord = {
  id: string;
  agentId: string;
  agentLabel: string;
  model: string | null;
  startedAt: string;
  endedAt: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
  costStatus: string | null;
};

export type UsageBreakdownRow = {
  key: string;
  label: string;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type UsageWindowSummary = {
  id: UsageWindowId;
  label: string;
  days: number;
  sessionCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  topModel: UsageBreakdownRow | null;
  topAgent: UsageBreakdownRow | null;
  byModel: UsageBreakdownRow[];
  byAgent: UsageBreakdownRow[];
};

export type HermesUsageSummary = {
  loadedAt: string;
  windows: UsageWindowSummary[];
  availableWindows: UsageWindowId[];
};

export const usageWindowIdSchema = z.enum(["1d", "7d", "30d"]);

export const usageSessionRecordSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentLabel: z.string(),
  model: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  estimatedCostUsd: z.number().nullable(),
  costStatus: z.string().nullable(),
});

export const usageBreakdownRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  sessions: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  estimatedCostUsd: z.number(),
});

export const usageWindowSummarySchema = z.object({
  id: usageWindowIdSchema,
  label: z.string(),
  days: z.number(),
  sessionCount: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  reasoningTokens: z.number(),
  totalTokens: z.number(),
  estimatedCostUsd: z.number(),
  topModel: usageBreakdownRowSchema.nullable(),
  topAgent: usageBreakdownRowSchema.nullable(),
  byModel: z.array(usageBreakdownRowSchema),
  byAgent: z.array(usageBreakdownRowSchema),
});

export const hermesUsageSummarySchema = z.object({
  loadedAt: z.string(),
  windows: z.array(usageWindowSummarySchema),
  availableWindows: z.array(usageWindowIdSchema),
});
