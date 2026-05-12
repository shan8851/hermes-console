import { z } from 'zod';

export const DEFAULT_MEMORY_CHAR_LIMIT = 2200;
export const DEFAULT_USER_CHAR_LIMIT = 1375;

export type MemoryScope = 'memory' | 'user';
export type MemoryLimitSource = 'config' | 'default';
export type MemoryReadStatus = 'ready' | 'partial' | 'missing';
export type MemoryPressureLevel = 'healthy' | 'approaching_limit' | 'near_limit' | 'at_limit';
export type MemoryStatusLevel = 'healthy' | 'pressured' | 'missing' | 'stale' | 'unknown';
export type MemoryProviderKind = 'built_in_only' | 'external';
export type MemoryProviderStatus = 'built_in_only' | 'configured' | 'setup_needed' | 'provider_missing' | 'unknown';
export type MemoryProviderRequirementStatus = 'present' | 'missing' | 'unknown';

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
  lastModifiedMs: number | null;
  rawContent: string;
  preamble: string;
  entries: MemoryEntry[];
  charCount: number;
  limit: number;
  usageRatio: number;
  usagePercentage: number;
  pressureLevel: MemoryPressureLevel;
};

export type MemoryProviderRequirementSummary = {
  envVar: string;
  required: boolean;
  status: MemoryProviderRequirementStatus;
};

export type MemoryProviderSummary = {
  kind: MemoryProviderKind;
  name: string;
  status: MemoryProviderStatus;
  description: string | null;
  configuredProvider: string | null;
  requirements: MemoryProviderRequirementSummary[];
};

export type MemoryStatusSummary = {
  level: MemoryStatusLevel;
  label: string;
  detail: string;
  latestModifiedMs: number | null;
  staleAfterDays: number;
};

export type MemoryReadResult = {
  status: MemoryReadStatus;
  rootPath: string;
  configPath: string;
  provider: MemoryProviderSummary;
  statusSummary: MemoryStatusSummary;
  limits: {
    memory: MemoryLimitSummary;
    user: MemoryLimitSummary;
  };
  files: {
    memory: MemoryFileSummary;
    user: MemoryFileSummary;
  };
};

export type AgentMemoryReadResult = MemoryReadResult & {
  agentId: string;
  agentLabel: string;
  agentSource: 'root' | 'profile';
};

export type HermesMemoryIndex = {
  agents: AgentMemoryReadResult[];
  agentCount: number;
  agentsWithMemory: number;
};

export const memoryScopeSchema = z.enum(['memory', 'user']);
export const memoryLimitSourceSchema = z.enum(['config', 'default']);
export const memoryReadStatusSchema = z.enum(['ready', 'partial', 'missing']);
export const memoryPressureLevelSchema = z.enum(['healthy', 'approaching_limit', 'near_limit', 'at_limit']);
export const memoryStatusLevelSchema = z.enum(['healthy', 'pressured', 'missing', 'stale', 'unknown']);
export const memoryProviderKindSchema = z.enum(['built_in_only', 'external']);
export const memoryProviderStatusSchema = z.enum([
  'built_in_only',
  'configured',
  'setup_needed',
  'provider_missing',
  'unknown'
]);
export const memoryProviderRequirementStatusSchema = z.enum(['present', 'missing', 'unknown']);

export const memoryEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  charCount: z.number()
});

export const memoryLimitSummarySchema = z.object({
  value: z.number(),
  source: memoryLimitSourceSchema
});

export const memoryFileSummarySchema = z.object({
  scope: memoryScopeSchema,
  label: z.string(),
  filePath: z.string(),
  exists: z.boolean(),
  lastModifiedMs: z.number().nullable().optional().default(null),
  rawContent: z.string(),
  preamble: z.string(),
  entries: z.array(memoryEntrySchema),
  charCount: z.number(),
  limit: z.number(),
  usageRatio: z.number(),
  usagePercentage: z.number(),
  pressureLevel: memoryPressureLevelSchema
});

export const memoryProviderRequirementSummarySchema = z.object({
  envVar: z.string(),
  required: z.boolean(),
  status: memoryProviderRequirementStatusSchema
});

export const memoryProviderSummarySchema = z.object({
  kind: memoryProviderKindSchema,
  name: z.string(),
  status: memoryProviderStatusSchema,
  description: z.string().nullable(),
  configuredProvider: z.string().nullable(),
  requirements: z.array(memoryProviderRequirementSummarySchema)
});

export const memoryStatusSummarySchema = z.object({
  level: memoryStatusLevelSchema,
  label: z.string(),
  detail: z.string(),
  latestModifiedMs: z.number().nullable(),
  staleAfterDays: z.number()
});

export const memoryReadResultSchema = z.object({
  status: memoryReadStatusSchema,
  rootPath: z.string(),
  configPath: z.string(),
  provider: memoryProviderSummarySchema.optional().default({
    kind: 'built_in_only',
    name: 'Built-in markdown',
    status: 'built_in_only',
    description: null,
    configuredProvider: null,
    requirements: []
  }),
  statusSummary: memoryStatusSummarySchema.optional().default({
    level: 'unknown',
    label: 'Unknown',
    detail: 'Memory status was not included in this response.',
    latestModifiedMs: null,
    staleAfterDays: 90
  }),
  limits: z.object({
    memory: memoryLimitSummarySchema,
    user: memoryLimitSummarySchema
  }),
  files: z.object({
    memory: memoryFileSummarySchema,
    user: memoryFileSummarySchema
  })
});

export const agentMemoryReadResultSchema = memoryReadResultSchema.extend({
  agentId: z.string(),
  agentLabel: z.string(),
  agentSource: z.enum(['root', 'profile'])
});

export const hermesMemoryIndexSchema = z.object({
  agents: z.array(agentMemoryReadResultSchema),
  agentCount: z.number(),
  agentsWithMemory: z.number()
});
