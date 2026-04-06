import { z } from "zod";

export const DEFAULT_MEMORY_CHAR_LIMIT = 2200;
export const DEFAULT_USER_CHAR_LIMIT = 1375;

export type MemoryScope = "memory" | "user";
export type MemoryLimitSource = "config" | "default";
export type MemoryReadStatus = "ready" | "partial" | "missing";
export type MemoryPressureLevel =
  | "healthy"
  | "approaching_limit"
  | "near_limit"
  | "at_limit";

export type MemoryEntry = {
  id: string;
  content: string;
  charCount: number;
};

export type MemoryLimitSummary = {
  value: number;
  source: MemoryLimitSource;
};

export type MemoryFileSummary = {
  scope: MemoryScope;
  label: string;
  filePath: string;
  exists: boolean;
  rawContent: string;
  preamble: string;
  entries: MemoryEntry[];
  charCount: number;
  limit: number;
  usageRatio: number;
  usagePercentage: number;
  pressureLevel: MemoryPressureLevel;
};

export type MemoryReadResult = {
  status: MemoryReadStatus;
  rootPath: string;
  configPath: string;
  limits: {
    memory: MemoryLimitSummary;
    user: MemoryLimitSummary;
  };
  files: {
    memory: MemoryFileSummary;
    user: MemoryFileSummary;
  };
};

export const memoryScopeSchema = z.enum(["memory", "user"]);
export const memoryLimitSourceSchema = z.enum(["config", "default"]);
export const memoryReadStatusSchema = z.enum(["ready", "partial", "missing"]);
export const memoryPressureLevelSchema = z.enum([
  "healthy",
  "approaching_limit",
  "near_limit",
  "at_limit",
]);

export const memoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  charCount: z.number(),
});

export const memoryLimitSummarySchema = z.object({
  value: z.number(),
  source: memoryLimitSourceSchema,
});

export const memoryFileSummarySchema = z.object({
  scope: memoryScopeSchema,
  label: z.string(),
  filePath: z.string(),
  exists: z.boolean(),
  rawContent: z.string(),
  preamble: z.string(),
  entries: z.array(memoryEntrySchema),
  charCount: z.number(),
  limit: z.number(),
  usageRatio: z.number(),
  usagePercentage: z.number(),
  pressureLevel: memoryPressureLevelSchema,
});

export const memoryReadResultSchema = z.object({
  status: memoryReadStatusSchema,
  rootPath: z.string(),
  configPath: z.string(),
  limits: z.object({
    memory: memoryLimitSummarySchema,
    user: memoryLimitSummarySchema,
  }),
  files: z.object({
    memory: memoryFileSummarySchema,
    user: memoryFileSummarySchema,
  }),
});
