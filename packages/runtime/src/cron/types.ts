import { z } from "zod";

export type CronAgentRef = {
  id: string;
  label: string;
  rootPath: string;
  source: "root" | "profile";
};

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
  createdAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  deliver: string | null;
  prompt: string;
  skills: string[];
  skill: string | null;
  scheduleKind: string | null;
  repeatCompleted: number | null;
  originChatName: string | null;
};

export type CronRunOutputState = "silent" | "contentful" | "missing";

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

export type HermesCronJobSummary = CronJobRecord & {
  summaryId: string;
  statusTone: "healthy" | "warning" | "error" | "muted";
  attentionLevel: "healthy" | "warning" | "critical" | "muted";
  overdue: boolean;
  failureStreak: number;
  recentFailureCount: number;
  observedRunCount: number;
  latestDurationMs: number | null;
  averageDurationMs: number | null;
  latestOutputState: CronRunOutputState;
  recentOutputCount: number;
};

export type HermesCronIndex = {
  jobs: HermesCronJobSummary[];
  agentCount: number;
  agentsWithCron: number;
};

export type HermesCronJobDetail = {
  job: HermesCronJobSummary;
  outputs: CronRunOutputRecord[];
  recentOutputCount: number;
  latestOutputState: CronRunOutputState;
  hasOutputs: boolean;
};

export type CronJobScheduleSource = {
  kind?: string | null | undefined;
  display?: string | null | undefined;
};

export type CronJobRepeatSource = {
  completed?: number | null | undefined;
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
  last_status?: string | null | undefined;
  last_error?: string | null | undefined;
  deliver?: string | null | undefined;
  prompt?: string | null | undefined;
  skills?: string[] | undefined;
  skill?: string | null | undefined;
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
  source: z.enum(["root", "profile"]),
});

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
  createdAt: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  lastStatus: z.string().nullable(),
  lastError: z.string().nullable(),
  deliver: z.string().nullable(),
  prompt: z.string(),
  skills: z.array(z.string()),
  skill: z.string().nullable(),
  scheduleKind: z.string().nullable(),
  repeatCompleted: z.number().nullable(),
  originChatName: z.string().nullable(),
});

export const cronRunOutputStateSchema = z.enum([
  "silent",
  "contentful",
  "missing",
]);

export const cronRunOutputRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  fileName: z.string(),
  path: z.string(),
  createdAt: z.string().nullable(),
  responsePreview: z.string(),
  responseState: cronRunOutputStateSchema,
  rawContent: z.string(),
});

export const cronObservedRunRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  success: z.boolean(),
});

export const cronJobScheduleSourceSchema = z.object({
  kind: z.string().nullable().optional(),
  display: z.string().nullable().optional(),
});

export const cronJobRepeatSourceSchema = z.object({
  completed: z.number().nullable().optional(),
});

export const cronJobOriginSourceSchema = z.object({
  chat_name: z.string().nullable().optional(),
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
  last_status: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  deliver: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  skills: z.array(z.string()).optional(),
  skill: z.string().nullable().optional(),
  schedule: cronJobScheduleSourceSchema.nullable().optional(),
  repeat: cronJobRepeatSourceSchema.nullable().optional(),
  origin: cronJobOriginSourceSchema.nullable().optional(),
});

export const cronJobsFileSourceSchema = z.object({
  jobs: z.array(cronJobSourceRecordSchema),
});

export const hermesCronJobSummarySchema = cronJobRecordSchema.extend({
  summaryId: z.string(),
  statusTone: z.enum(["healthy", "warning", "error", "muted"]),
  attentionLevel: z.enum(["healthy", "warning", "critical", "muted"]),
  overdue: z.boolean(),
  failureStreak: z.number(),
  recentFailureCount: z.number(),
  observedRunCount: z.number(),
  latestDurationMs: z.number().nullable(),
  averageDurationMs: z.number().nullable(),
  latestOutputState: cronRunOutputStateSchema,
  recentOutputCount: z.number(),
});

export const hermesCronIndexSchema = z.object({
  jobs: z.array(hermesCronJobSummarySchema),
  agentCount: z.number(),
  agentsWithCron: z.number(),
});

export const hermesCronJobDetailSchema = z.object({
  job: hermesCronJobSummarySchema,
  outputs: z.array(cronRunOutputRecordSchema),
  recentOutputCount: z.number(),
  latestOutputState: cronRunOutputStateSchema,
  hasOutputs: z.boolean(),
});
