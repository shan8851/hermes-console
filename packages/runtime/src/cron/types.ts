import { z } from 'zod';

export type CronAgentRef = {
  id: string;
  label: string;
  rootPath: string;
  source: 'root' | 'profile';
};

export type CronScheduleKind = 'cron' | 'interval' | 'once' | 'unknown';

export type CronJobRecord = {
  id: string;
  jobId: string;
  name: string;
  agentId: string;
  agentLabel: string;
  agentRootPath: string;
  enabled: boolean;
  state: string | null;
  scheduleDisplay: string;
  scheduleKind: CronScheduleKind;
  scheduleExpression: string | null;
  model: string | null;
  provider: string | null;
  baseUrl: string | null;
  scriptPath: string | null;
  noAgent: boolean;
  contextFrom: string[];
  enabledToolsets: string[];
  workdir: string | null;
  createdAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  pausedAt: string | null;
  pausedReason: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastDeliveryError: string | null;
  deliver: string | null;
  prompt: string;
  skills: string[];
  skill: string | null;
  repeatCompleted: number | null;
  repeatTimes: number | null;
  originChatName: string | null;
};

export type CronRunOutputState = 'silent' | 'contentful' | 'missing';

export type CronRunOutputRecord = {
  id: string;
  jobId: string;
  fileName: string;
  path: string;
  createdAt: string | null;
  responsePreview: string;
  responseState: CronRunOutputState;
  rawContent: string;
};

export type CronObservedRunRecord = {
  id: string;
  jobId: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  success: boolean;
};

export type CronUpcomingRun = {
  id: string;
  scheduledAt: string;
};

export type HermesCronJobSummary = CronJobRecord & {
  summaryId: string;
  statusTone: 'healthy' | 'warning' | 'error' | 'muted';
  attentionLevel: 'healthy' | 'warning' | 'critical' | 'muted';
  overdue: boolean;
  failureStreak: number;
  recentObservedRunCount: number;
  recentSuccessCount: number;
  recentFailureCount: number;
  recentSuccessRate: number | null;
  observedRunCount: number;
  lastSuccessfulRunAt: string | null;
  lastFailedRunAt: string | null;
  latestDurationMs: number | null;
  averageDurationMs: number | null;
  latestOutputState: CronRunOutputState;
  recentOutputCount: number;
  upcomingRuns: CronUpcomingRun[];
};

export type HermesCronIndex = {
  jobs: HermesCronJobSummary[];
  agentCount: number;
  agentsWithCron: number;
};

export type HermesCronJobDetail = {
  job: HermesCronJobSummary;
  outputs: CronRunOutputRecord[];
  observedRuns: CronObservedRunRecord[];
  upcomingRuns: CronUpcomingRun[];
  recentOutputCount: number;
  latestOutputState: CronRunOutputState;
  hasOutputs: boolean;
};

export type CronJobScheduleSource = {
  kind?: string | null | undefined;
  display?: string | null | undefined;
  expr?: string | null | undefined;
  minutes?: number | null | undefined;
  run_at?: string | null | undefined;
};

export type CronJobRepeatSource = {
  completed?: number | null | undefined;
  times?: number | null | undefined;
};

export type CronJobOriginSource = {
  chat_name?: string | null | undefined;
};

export type CronJobSourceRecord = {
  id: string;
  name?: string | null | undefined;
  enabled?: boolean | undefined;
  state?: string | null | undefined;
  schedule_display?: string | null | undefined;
  created_at?: string | null | undefined;
  next_run_at?: string | null | undefined;
  last_run_at?: string | null | undefined;
  paused_at?: string | null | undefined;
  paused_reason?: string | null | undefined;
  last_status?: string | null | undefined;
  last_error?: string | null | undefined;
  last_delivery_error?: string | null | undefined;
  deliver?: string | null | undefined;
  prompt?: string | null | undefined;
  skills?: string[] | undefined;
  skill?: string | null | undefined;
  model?: string | null | undefined;
  provider?: string | null | undefined;
  base_url?: string | null | undefined;
  script?: string | null | undefined;
  no_agent?: boolean | undefined;
  context_from?: string[] | null | undefined;
  enabled_toolsets?: string[] | null | undefined;
  workdir?: string | null | undefined;
  schedule?: CronJobScheduleSource | null | undefined;
  repeat?: CronJobRepeatSource | null | undefined;
  origin?: CronJobOriginSource | null | undefined;
};

export type CronJobsFileSource = {
  jobs: CronJobSourceRecord[];
};

export const cronAgentRefSchema = z.object({
  id: z.string(),
  label: z.string(),
  rootPath: z.string(),
  source: z.enum(['root', 'profile'])
});

export const cronScheduleKindSchema = z.enum(['cron', 'interval', 'once', 'unknown']);

export const cronJobRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  name: z.string(),
  agentId: z.string(),
  agentLabel: z.string(),
  agentRootPath: z.string(),
  enabled: z.boolean(),
  state: z.string().nullable(),
  scheduleDisplay: z.string(),
  scheduleKind: cronScheduleKindSchema,
  scheduleExpression: z.string().nullable(),
  model: z.string().nullable(),
  provider: z.string().nullable(),
  baseUrl: z.string().nullable(),
  scriptPath: z.string().nullable(),
  noAgent: z.boolean(),
  contextFrom: z.array(z.string()),
  enabledToolsets: z.array(z.string()),
  workdir: z.string().nullable(),
  createdAt: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  pausedAt: z.string().nullable(),
  pausedReason: z.string().nullable(),
  lastStatus: z.string().nullable(),
  lastError: z.string().nullable(),
  lastDeliveryError: z.string().nullable(),
  deliver: z.string().nullable(),
  prompt: z.string(),
  skills: z.array(z.string()),
  skill: z.string().nullable(),
  repeatCompleted: z.number().nullable(),
  repeatTimes: z.number().nullable(),
  originChatName: z.string().nullable()
});

export const cronRunOutputStateSchema = z.enum(['silent', 'contentful', 'missing']);

export const cronRunOutputRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  fileName: z.string(),
  path: z.string(),
  createdAt: z.string().nullable(),
  responsePreview: z.string(),
  responseState: cronRunOutputStateSchema,
  rawContent: z.string()
});

export const cronObservedRunRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  success: z.boolean()
});

export const cronUpcomingRunSchema = z.object({
  id: z.string(),
  scheduledAt: z.string()
});

export const cronJobScheduleSourceSchema = z.object({
  kind: z.string().nullable().optional(),
  display: z.string().nullable().optional(),
  expr: z.string().nullable().optional(),
  minutes: z.number().nullable().optional(),
  run_at: z.string().nullable().optional()
});

export const cronJobRepeatSourceSchema = z.object({
  completed: z.number().nullable().optional(),
  times: z.number().nullable().optional()
});

export const cronJobOriginSourceSchema = z.object({
  chat_name: z.string().nullable().optional()
});

export const cronJobSourceRecordSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  state: z.string().nullable().optional(),
  schedule_display: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  next_run_at: z.string().nullable().optional(),
  last_run_at: z.string().nullable().optional(),
  paused_at: z.string().nullable().optional(),
  paused_reason: z.string().nullable().optional(),
  last_status: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  last_delivery_error: z.string().nullable().optional(),
  deliver: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  skills: z.array(z.string()).optional(),
  skill: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  base_url: z.string().nullable().optional(),
  script: z.string().nullable().optional(),
  no_agent: z.boolean().optional(),
  context_from: z.array(z.string()).nullable().optional(),
  enabled_toolsets: z.array(z.string()).nullable().optional(),
  workdir: z.string().nullable().optional(),
  schedule: cronJobScheduleSourceSchema.nullable().optional(),
  repeat: cronJobRepeatSourceSchema.nullable().optional(),
  origin: cronJobOriginSourceSchema.nullable().optional()
});

export const cronJobsFileSourceSchema = z.object({
  jobs: z.array(cronJobSourceRecordSchema)
});

export const hermesCronJobSummarySchema = cronJobRecordSchema.extend({
  summaryId: z.string(),
  statusTone: z.enum(['healthy', 'warning', 'error', 'muted']),
  attentionLevel: z.enum(['healthy', 'warning', 'critical', 'muted']),
  overdue: z.boolean(),
  failureStreak: z.number(),
  recentObservedRunCount: z.number(),
  recentSuccessCount: z.number(),
  recentFailureCount: z.number(),
  recentSuccessRate: z.number().nullable(),
  observedRunCount: z.number(),
  lastSuccessfulRunAt: z.string().nullable(),
  lastFailedRunAt: z.string().nullable(),
  latestDurationMs: z.number().nullable(),
  averageDurationMs: z.number().nullable(),
  latestOutputState: cronRunOutputStateSchema,
  recentOutputCount: z.number(),
  upcomingRuns: z.array(cronUpcomingRunSchema)
});

export const hermesCronIndexSchema = z.object({
  jobs: z.array(hermesCronJobSummarySchema),
  agentCount: z.number(),
  agentsWithCron: z.number()
});

export const hermesCronJobDetailSchema = z.object({
  job: hermesCronJobSummarySchema,
  outputs: z.array(cronRunOutputRecordSchema),
  observedRuns: z.array(cronObservedRunRecordSchema),
  upcomingRuns: z.array(cronUpcomingRunSchema),
  recentOutputCount: z.number(),
  latestOutputState: cronRunOutputStateSchema,
  hasOutputs: z.boolean()
});
