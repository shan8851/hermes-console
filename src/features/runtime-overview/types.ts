import type { MemoryPressureLevel } from "@/features/memory/types";

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
    failingCronJobs: number;
    contentfulCronJobs: number;
    silentCronJobs: number;
    memoryPressure: MemoryPressureLevel;
  };
  installStatus: string;
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
