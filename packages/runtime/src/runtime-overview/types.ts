import { z } from "zod";

import type { InventoryInstallationStatus } from "../inventory/discovery.js";
import { inventoryInstallationStatusSchema } from "../inventory/discovery.js";
import type { MemoryPressureLevel } from "../memory/types.js";
import { memoryPressureLevelSchema } from "../memory/types.js";

export type GatewaySummary = {
  state: "running" | "stopped" | "unknown";
  updatedAt: string | null;
  connectedPlatforms: string[];
  platformStates: Record<string, string>;
};

export type ChannelDirectorySummary = {
  updatedAt: string | null;
  connectedPlatforms: string[];
  totalConfiguredEntries: number;
  platforms: Record<string, { total: number; threads: number }>;
};

export type UpdateStatusSummary = {
  checkedAt: string | null;
  behind: number | null;
  status: "up_to_date" | "behind" | "unknown";
};

export type ConfigPostureSummary = {
  model: string | null;
  provider: string | null;
  webBackend: string | null;
  terminalBackend: string | null;
  ttsProvider: string | null;
  sttProvider: string | null;
  approvalsMode: string | null;
  compressionEnabled: boolean | null;
  redactSecrets: boolean | null;
  tirithEnabled: boolean | null;
  discordRequireMention: boolean | null;
  discordAutoThread: boolean | null;
  configuredPlatforms: string[];
};

export type ParsedStatusEntryState = "configured" | "not_configured" | "logged_in" | "not_logged_in" | "running" | "not_running" | "present" | "missing" | "warning" | "unknown";

export type StatusEntry = {
  name: string;
  state: ParsedStatusEntryState;
  symbol: "ok" | "error" | "warn" | "unknown";
  detail: string | null;
};

export type StatusSnapshotSummary = {
  capturedAt: string | null;
  apiKeys: StatusEntry[];
  authProviders: StatusEntry[];
  apiKeyProviders: StatusEntry[];
  messagingPlatforms: StatusEntry[];
  gatewayStatus: StatusEntry | null;
  scheduledJobs: { active: number | null; total: number | null };
  sessions: { active: number | null };
};

export type DoctorSnapshotSummary = {
  capturedAt: string | null;
  issueCount: number;
  issues: string[];
  toolWarnings: string[];
  authProviders: StatusEntry[];
};

export type OverviewWarning = {
  id: string;
  tone: "critical" | "warning" | "info";
  title: string;
  detail: string;
};

export type OverviewVerdict = {
  status: "solid" | "needs_attention" | "broken";
  label: string;
  summary: string;
};

export type RuntimeHealthItem = {
  label: string;
  value: string;
  detail: string;
  tone: "healthy" | "warning" | "critical" | "default";
};

export type PlatformSurfaceSummary = {
  name: string;
  configured: boolean;
  live: boolean | null;
  detail: string;
  defaults: string[];
};

export type AccessCheckSummary = {
  name: string;
  status: "available" | "missing" | "warning" | "unknown";
  detail: string;
};

export type RuntimeProfileItem = {
  label: string;
  value: string;
  detail: string;
};

export type RuntimeOverviewSummary = {
  capturedAt: string | null;
  verdict: OverviewVerdict;
  warnings: OverviewWarning[];
  runtimeHealth: RuntimeHealthItem[];
  platforms: PlatformSurfaceSummary[];
  access: {
    authProviders: AccessCheckSummary[];
    apiKeys: AccessCheckSummary[];
  };
  runtimeProfile: RuntimeProfileItem[];
  activity: {
    sessionCount: number;
    cronAttentionJobs: number;
    overdueCronJobs: number;
    contentfulCronJobs: number;
    memoryPressure: MemoryPressureLevel;
  };
  installStatus: InventoryInstallationStatus;
  availableAgentCount: number;
  totalAgentCount: number;
  gatewayState: GatewaySummary["state"];
  gatewayUpdatedAt: string | null;
  connectedPlatforms: string[];
  configuredPlatforms: string[];
  configuredPlatformCount: number;
  updateBehind: number | null;
  updateStatus: UpdateStatusSummary["status"];
  doctorIssueCount: number;
};

export type ShellStatusSummary = {
  capturedAt: string | null;
  rootPath: string;
  rootKind: "default" | "env_override";
  installStatus: InventoryInstallationStatus;
  gatewayState: GatewaySummary["state"];
  updateStatus: UpdateStatusSummary["status"];
  updateBehind: number | null;
  connectedPlatformCount: number;
};

export const gatewaySummarySchema = z.object({
  state: z.enum(["running", "stopped", "unknown"]),
  updatedAt: z.string().nullable(),
  connectedPlatforms: z.array(z.string()),
  platformStates: z.record(z.string(), z.string()),
});

export const channelDirectorySummarySchema = z.object({
  updatedAt: z.string().nullable(),
  connectedPlatforms: z.array(z.string()),
  totalConfiguredEntries: z.number(),
  platforms: z.record(
    z.string(),
    z.object({
      total: z.number(),
      threads: z.number(),
    }),
  ),
});

export const updateStatusSummarySchema = z.object({
  checkedAt: z.string().nullable(),
  behind: z.number().nullable(),
  status: z.enum(["up_to_date", "behind", "unknown"]),
});

export const configPostureSummarySchema = z.object({
  model: z.string().nullable(),
  provider: z.string().nullable(),
  webBackend: z.string().nullable(),
  terminalBackend: z.string().nullable(),
  ttsProvider: z.string().nullable(),
  sttProvider: z.string().nullable(),
  approvalsMode: z.string().nullable(),
  compressionEnabled: z.boolean().nullable(),
  redactSecrets: z.boolean().nullable(),
  tirithEnabled: z.boolean().nullable(),
  discordRequireMention: z.boolean().nullable(),
  discordAutoThread: z.boolean().nullable(),
  configuredPlatforms: z.array(z.string()),
});

export const parsedStatusEntryStateSchema = z.enum([
  "configured",
  "not_configured",
  "logged_in",
  "not_logged_in",
  "running",
  "not_running",
  "present",
  "missing",
  "warning",
  "unknown",
]);

export const statusEntrySchema = z.object({
  name: z.string(),
  state: parsedStatusEntryStateSchema,
  symbol: z.enum(["ok", "error", "warn", "unknown"]),
  detail: z.string().nullable(),
});

export const statusSnapshotSummarySchema = z.object({
  capturedAt: z.string().nullable(),
  apiKeys: z.array(statusEntrySchema),
  authProviders: z.array(statusEntrySchema),
  apiKeyProviders: z.array(statusEntrySchema),
  messagingPlatforms: z.array(statusEntrySchema),
  gatewayStatus: statusEntrySchema.nullable(),
  scheduledJobs: z.object({
    active: z.number().nullable(),
    total: z.number().nullable(),
  }),
  sessions: z.object({
    active: z.number().nullable(),
  }),
});

export const doctorSnapshotSummarySchema = z.object({
  capturedAt: z.string().nullable(),
  issueCount: z.number(),
  issues: z.array(z.string()),
  toolWarnings: z.array(z.string()),
  authProviders: z.array(statusEntrySchema),
});

export const overviewWarningSchema = z.object({
  id: z.string(),
  tone: z.enum(["critical", "warning", "info"]),
  title: z.string(),
  detail: z.string(),
});

export const overviewVerdictSchema = z.object({
  status: z.enum(["solid", "needs_attention", "broken"]),
  label: z.string(),
  summary: z.string(),
});

export const runtimeHealthItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: z.enum(["healthy", "warning", "critical", "default"]),
});

export const platformSurfaceSummarySchema = z.object({
  name: z.string(),
  configured: z.boolean(),
  live: z.boolean().nullable(),
  detail: z.string(),
  defaults: z.array(z.string()),
});

export const accessCheckSummarySchema = z.object({
  name: z.string(),
  status: z.enum(["available", "missing", "warning", "unknown"]),
  detail: z.string(),
});

export const runtimeProfileItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string(),
});

export const runtimeOverviewSummarySchema = z.object({
  capturedAt: z.string().nullable(),
  verdict: overviewVerdictSchema,
  warnings: z.array(overviewWarningSchema),
  runtimeHealth: z.array(runtimeHealthItemSchema),
  platforms: z.array(platformSurfaceSummarySchema),
  access: z.object({
    authProviders: z.array(accessCheckSummarySchema),
    apiKeys: z.array(accessCheckSummarySchema),
  }),
  runtimeProfile: z.array(runtimeProfileItemSchema),
  activity: z.object({
    sessionCount: z.number(),
    cronAttentionJobs: z.number(),
    overdueCronJobs: z.number(),
    contentfulCronJobs: z.number(),
    memoryPressure: memoryPressureLevelSchema,
  }),
  installStatus: inventoryInstallationStatusSchema,
  availableAgentCount: z.number(),
  totalAgentCount: z.number(),
  gatewayState: gatewaySummarySchema.shape.state,
  gatewayUpdatedAt: z.string().nullable(),
  connectedPlatforms: z.array(z.string()),
  configuredPlatforms: z.array(z.string()),
  configuredPlatformCount: z.number(),
  updateBehind: z.number().nullable(),
  updateStatus: updateStatusSummarySchema.shape.status,
  doctorIssueCount: z.number(),
});

export const shellStatusSummarySchema = z.object({
  capturedAt: z.string().nullable(),
  rootPath: z.string(),
  rootKind: z.enum(["default", "env_override"]),
  installStatus: inventoryInstallationStatusSchema,
  gatewayState: gatewaySummarySchema.shape.state,
  updateStatus: updateStatusSummarySchema.shape.status,
  updateBehind: z.number().nullable(),
  connectedPlatformCount: z.number(),
});
