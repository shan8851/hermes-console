import { z } from 'zod';

export type HermesLogLevel = 'error' | 'warning' | 'info' | 'debug' | 'other';

export type HermesLogFileSummary = {
  id: string;
  name: string;
  path: string;
  fileSize: number;
  lastModifiedMs: number;
  analyzedLineCount: number;
  errorLineCount: number;
  warningLineCount: number;
  infoLineCount: number;
  debugLineCount: number;
};

export type HermesLogLine = {
  id: string;
  lineNumber: number;
  timestamp: string | null;
  level: HermesLogLevel;
  text: string;
};

export type HermesLogSessionLink = {
  agentId: string;
  sessionId: string;
  href: string;
};

export type HermesLogEventLevel = 'error' | 'warning';

export type HermesLogEvent = {
  id: string;
  logId: string;
  logName: string;
  lineNumber: number;
  timestamp: string | null;
  level: HermesLogEventLevel;
  rawLevel: string | null;
  logger: string | null;
  component: string | null;
  sessionId: string | null;
  message: string;
  messageOmittedCharCount: number;
  rawLine: string;
  rawLineOmittedCharCount: number;
  sessionLink: HermesLogSessionLink | null;
};

export type HermesLogEventGroup = {
  id: string;
  label: string;
  errorCount: number;
  warningCount: number;
  latestTimestamp: string | null;
};

export type HermesLogEventSummary = {
  analyzedLineCount: number;
  recentErrorCount: number;
  recentWarningCount: number;
  topEvents: HermesLogEvent[];
  componentGroups: HermesLogEventGroup[];
  fileGroups: HermesLogEventGroup[];
};

export type HermesLogsIndex = {
  logs: HermesLogFileSummary[];
  eventSummary: HermesLogEventSummary;
};

export type HermesLogDetail = {
  file: HermesLogFileSummary;
  requestedLines: number;
  returnedLines: number;
  lines: HermesLogLine[];
};

export const hermesLogLevelSchema = z.enum(['error', 'warning', 'info', 'debug', 'other']);

export const hermesLogFileSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  fileSize: z.number(),
  lastModifiedMs: z.number(),
  analyzedLineCount: z.number(),
  errorLineCount: z.number(),
  warningLineCount: z.number(),
  infoLineCount: z.number(),
  debugLineCount: z.number()
});

export const hermesLogLineSchema = z.object({
  id: z.string(),
  lineNumber: z.number(),
  timestamp: z.string().nullable(),
  level: hermesLogLevelSchema,
  text: z.string()
});

export const hermesLogSessionLinkSchema = z.object({
  agentId: z.string(),
  sessionId: z.string(),
  href: z.string()
});

export const hermesLogEventLevelSchema = z.enum(['error', 'warning']);

export const hermesLogEventSchema = z.object({
  id: z.string(),
  logId: z.string(),
  logName: z.string(),
  lineNumber: z.number(),
  timestamp: z.string().nullable(),
  level: hermesLogEventLevelSchema,
  rawLevel: z.string().nullable(),
  logger: z.string().nullable(),
  component: z.string().nullable(),
  sessionId: z.string().nullable(),
  message: z.string(),
  messageOmittedCharCount: z.number(),
  rawLine: z.string(),
  rawLineOmittedCharCount: z.number(),
  sessionLink: hermesLogSessionLinkSchema.nullable()
});

export const hermesLogEventGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  errorCount: z.number(),
  warningCount: z.number(),
  latestTimestamp: z.string().nullable()
});

export const hermesLogEventSummarySchema = z.object({
  analyzedLineCount: z.number(),
  recentErrorCount: z.number(),
  recentWarningCount: z.number(),
  topEvents: z.array(hermesLogEventSchema),
  componentGroups: z.array(hermesLogEventGroupSchema),
  fileGroups: z.array(hermesLogEventGroupSchema)
});

export const hermesLogsIndexSchema = z.object({
  logs: z.array(hermesLogFileSummarySchema),
  eventSummary: hermesLogEventSummarySchema
});

export const hermesLogDetailSchema = z.object({
  file: hermesLogFileSummarySchema,
  requestedLines: z.number(),
  returnedLines: z.number(),
  lines: z.array(hermesLogLineSchema)
});
