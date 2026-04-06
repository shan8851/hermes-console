import type { InventoryInstallationStatus } from "../inventory/discovery.js";
import type { MemoryPressureLevel } from "../memory/types.js";
import type {
  AccessCheckSummary,
  ChannelDirectorySummary,
  ConfigPostureSummary,
  DoctorSnapshotSummary,
  GatewaySummary,
  OverviewVerdict,
  OverviewWarning,
  PlatformSurfaceSummary,
  RuntimeHealthItem,
  RuntimeOverviewSummary,
  RuntimeProfileItem,
  StatusEntry,
  StatusSnapshotSummary,
  UpdateStatusSummary,
} from "./types.js";

function getOverallMemoryPressureLevel(memory: {
  files: {
    memory: { pressureLevel: MemoryPressureLevel };
    user: { pressureLevel: MemoryPressureLevel };
  };
}) {
  if (
    memory.files.memory.pressureLevel === "at_limit" ||
    memory.files.user.pressureLevel === "at_limit"
  ) {
    return "at_limit";
  }
  if (
    memory.files.memory.pressureLevel === "near_limit" ||
    memory.files.user.pressureLevel === "near_limit"
  ) {
    return "near_limit";
  }
  if (
    memory.files.memory.pressureLevel === "approaching_limit" ||
    memory.files.user.pressureLevel === "approaching_limit"
  ) {
    return "approaching_limit";
  }
  return "healthy";
}

function summarizeCapabilityStatus(
  state: StatusEntry["state"],
  detail: string,
): AccessCheckSummary["status"] {
  if (["logged_in", "configured", "running", "present"].includes(state)) {
    return "available";
  }
  if (
    ["missing", "not_configured", "not_logged_in", "not_running"].includes(
      state,
    )
  ) {
    return "missing";
  }
  if (state === "warning") {
    return "warning";
  }
  return detail.toLowerCase().includes("unknown") ? "unknown" : "warning";
}

function titleCasePlatform(platform: string) {
  return platform
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function envHasAny(envEntries: Map<string, string>, keys: string[]) {
  return keys.some((key) => Boolean(envEntries.get(key)));
}

function buildWarnings({
  update,
  doctor,
  gateway,
  memoryPressure,
  cron,
}: {
  update: UpdateStatusSummary;
  doctor: DoctorSnapshotSummary;
  gateway: GatewaySummary;
  memoryPressure: MemoryPressureLevel;
  cron: {
    jobs: Array<{
      attentionLevel: string;
      overdue: boolean;
      failureStreak: number;
    }>;
  };
}) {
  const warnings: OverviewWarning[] = [];

  if (gateway.state !== "running") {
    warnings.push({
      id: "gateway-state",
      tone: "critical",
      title: "Gateway is not currently running",
      detail:
        "Hermes cannot deliver on connected messaging surfaces until the gateway comes back.",
    });
  }

  if (update.status === "behind" && (update.behind ?? 0) > 0) {
    warnings.push({
      id: "update-behind",
      tone: "warning",
      title: `Hermes is ${update.behind} commit${update.behind === 1 ? "" : "s"} behind tracked upstream`,
      detail: "The local installation is behind upstream and should be updated.",
    });
  }

  if (doctor.issueCount > 0) {
    warnings.push(
      ...doctor.issues.map((issue, index) => {
        const tone: OverviewWarning["tone"] = issue
          .toLowerCase()
          .includes("vulnerability")
          ? "warning"
          : "info";
        return {
          id: `doctor-${index}`,
          tone,
          title: issue,
          detail: "Reported by Hermes diagnostics.",
        };
      }),
    );
  }

  if (memoryPressure === "near_limit" || memoryPressure === "at_limit") {
    warnings.push({
      id: "memory-pressure",
      tone: memoryPressure === "at_limit" ? "critical" : "warning",
      title: `Memory pressure is ${memoryPressure.replace(/_/g, " ")}`,
      detail:
        "At least one Hermes memory file is close to its configured limit.",
    });
  }

  const cronAttentionJobs = cron.jobs.filter(
    (job) => job.attentionLevel === "warning" || job.attentionLevel === "critical",
  ).length;
  const overdueCronJobs = cron.jobs.filter((job) => job.overdue).length;
  const streakingCronJobs = cron.jobs.filter(
    (job) => job.failureStreak > 0,
  ).length;

  if (cronAttentionJobs > 0) {
    warnings.push({
      id: "cron-attention",
      tone: overdueCronJobs > 0 || streakingCronJobs >= 2 ? "warning" : "info",
      title: `${cronAttentionJobs} cron job${cronAttentionJobs === 1 ? "" : "s"} need attention`,
      detail:
        [
          overdueCronJobs > 0 ? `${overdueCronJobs} overdue` : null,
          streakingCronJobs > 0 ? `${streakingCronJobs} on a failure streak` : null,
        ]
          .filter(Boolean)
          .join(" · ") ||
        "Recent cron signals suggest one or more jobs need a closer look.",
    });
  }

  return warnings;
}

function buildVerdict({
  gateway,
  installation,
  warnings,
  connectedPlatforms,
}: {
  gateway: GatewaySummary;
  installation: {
    status: InventoryInstallationStatus;
    availableAgentCount: number;
    agents: Array<{ id: string }>;
  };
  warnings: OverviewWarning[];
  connectedPlatforms: string[];
}): OverviewVerdict {
  if (installation.availableAgentCount === 0 || gateway.state !== "running") {
    return {
      status: "broken",
      label: "Broken",
      summary: "Core runtime checks are failing. The installation needs attention.",
    };
  }

  if (
    warnings.some(
      (warning) =>
        warning.tone === "critical" || warning.tone === "warning",
    )
  ) {
    return {
      status: "needs_attention",
      label: "Needs attention",
      summary: `Gateway is ${gateway.state}, ${connectedPlatforms.length} surface${connectedPlatforms.length === 1 ? " is" : "s are"} live, but there are active warnings worth fixing.`,
    };
  }

  return {
    status: "solid",
    label: "Solid",
    summary: "Gateway, installation, and connected surfaces all look healthy.",
  };
}

function buildRuntimeHealthItems({
  installation,
  gateway,
  update,
  doctor,
  connectedPlatforms,
  configuredPlatformCount,
}: {
  installation: {
    status: InventoryInstallationStatus;
    availableAgentCount: number;
    agents: Array<{ id: string }>;
  };
  gateway: GatewaySummary;
  update: UpdateStatusSummary;
  doctor: DoctorSnapshotSummary;
  connectedPlatforms: string[];
  configuredPlatformCount: number;
}): RuntimeHealthItem[] {
  return [
    {
      label: "install",
      value: installation.status,
      detail: `${installation.availableAgentCount} of ${installation.agents.length} agents available.`,
      tone: installation.status === "ready" ? "healthy" : "warning",
    },
    {
      label: "gateway",
      value: gateway.state,
      detail: gateway.updatedAt
        ? `Last updated ${new Date(gateway.updatedAt).toLocaleString()}`
        : "No gateway data available.",
      tone: gateway.state === "running" ? "healthy" : "critical",
    },
    {
      label: "surfaces live",
      value: `${connectedPlatforms.length} / ${configuredPlatformCount}`,
      detail: `${connectedPlatforms.length} live, ${configuredPlatformCount} configured.`,
      tone: connectedPlatforms.length > 0 ? "healthy" : "warning",
    },
    {
      label: "doctor issues",
      value: String(doctor.issueCount),
      detail:
        doctor.issueCount > 0
          ? "Diagnostics found issues to review."
          : "No issues found.",
      tone: doctor.issueCount > 0 ? "warning" : "healthy",
    },
    {
      label: "update drift",
      value:
        update.status === "behind"
          ? `${update.behind} behind`
          : update.status === "up_to_date"
            ? "up to date"
            : "unknown",
      detail: update.checkedAt
        ? `Last checked ${new Date(update.checkedAt).toLocaleString()}.`
        : "Last check time unknown.",
      tone:
        update.status === "behind"
          ? "warning"
          : update.status === "up_to_date"
            ? "healthy"
            : "default",
    },
  ];
}

function getPlatformDefaultSummary(
  platform: string,
  config: ConfigPostureSummary,
) {
  if (platform === "discord") {
    return [
      `mention ${config.discordRequireMention == null ? "unknown" : config.discordRequireMention ? "required" : "not required"}`,
      `auto-thread ${config.discordAutoThread == null ? "unknown" : config.discordAutoThread ? "enabled" : "disabled"}`,
    ];
  }
  return [];
}

function buildPlatformSummaries({
  status,
  gateway,
  channels,
  config,
}: {
  status: StatusSnapshotSummary;
  gateway: GatewaySummary;
  channels: ChannelDirectorySummary;
  config: ConfigPostureSummary;
}): PlatformSurfaceSummary[] {
  const names = new Set<string>([
    ...status.messagingPlatforms.map((entry) => entry.name.toLowerCase()),
    ...Object.keys(gateway.platformStates),
    ...Object.keys(channels.platforms),
    ...config.configuredPlatforms,
  ]);

  return Array.from(names)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((platform) => {
      const statusEntry = status.messagingPlatforms.find(
        (entry) => entry.name.toLowerCase() === platform,
      );
      const liveState = gateway.platformStates[platform];
      const configured = statusEntry
        ? statusEntry.state !== "not_configured"
        : (channels.platforms[platform]?.total ?? 0) > 0 ||
          config.configuredPlatforms.includes(platform);
      const live = liveState ? liveState === "connected" : configured ? false : null;
      const channelCount = channels.platforms[platform]?.total ?? 0;
      const detail =
        [
          statusEntry?.detail,
          channelCount > 0
            ? `${channelCount} routed channel${channelCount === 1 ? "" : "s"}`
            : configured
              ? "No routed channels discovered"
              : null,
          liveState ? `gateway ${liveState}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "No current signal found.";

      return {
        name: titleCasePlatform(platform),
        configured,
        live,
        detail,
        defaults: getPlatformDefaultSummary(platform, config),
      };
    });
}

function buildApiKeyChecks(envEntries: Map<string, string>): AccessCheckSummary[] {
  const checks: Array<{ name: string; detail: string; vars: string[] }> = [
    {
      name: "Model access",
      detail: "LLM provider credentials.",
      vars: [
        "OPENROUTER_API_KEY",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GLM_API_KEY",
        "KIMI_API_KEY",
        "MINIMAX_API_KEY",
        "MINIMAX_CN_API_KEY",
      ],
    },
    {
      name: "Voice access",
      detail: "Voice provider credentials.",
      vars: ["VOICE_TOOLS_OPENAI_KEY", "OPENAI_API_KEY", "ELEVENLABS_API_KEY"],
    },
    {
      name: "Search backend",
      detail: "Web search credentials.",
      vars: ["EXA_API_KEY", "PARALLEL_API_KEY", "FIRECRAWL_API_KEY", "TAVILY_API_KEY"],
    },
    {
      name: "Browser cloud",
      detail: "Browser automation credentials.",
      vars: ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID"],
    },
    { name: "GitHub", detail: "GitHub API token.", vars: ["GITHUB_TOKEN"] },
  ];

  return checks.map((check) => ({
    name: check.name,
    status: envHasAny(envEntries, check.vars) ? "available" : "missing",
    detail: check.detail,
  }));
}

function buildAuthChecks(entries: StatusEntry[]): AccessCheckSummary[] {
  return entries.map((entry) => ({
    name: entry.name,
    status: summarizeCapabilityStatus(entry.state, entry.detail ?? ""),
    detail: entry.detail ?? "No details available.",
  }));
}

function buildRuntimeProfile(
  config: ConfigPostureSummary,
  envEntries: Map<string, string>,
): RuntimeProfileItem[] {
  const voiceOutput = config.ttsProvider
    ? config.ttsProvider === "edge"
      ? "Edge (no key needed)"
      : `${config.ttsProvider} ${envHasAny(envEntries, ["VOICE_TOOLS_OPENAI_KEY", "OPENAI_API_KEY", "ELEVENLABS_API_KEY"]) ? "available" : "needs credentials"}`
    : "unknown";
  const voiceInput = config.sttProvider
    ? config.sttProvider === "local"
      ? "Local transcription"
      : `${config.sttProvider} ${envHasAny(envEntries, ["VOICE_TOOLS_OPENAI_KEY", "OPENAI_API_KEY"]) ? "available" : "needs credentials"}`
    : "unknown";

  return [
    {
      label: "model",
      value: config.model ?? "unknown",
      detail: config.provider ?? "provider unknown",
    },
    {
      label: "search",
      value: config.webBackend ?? "unknown",
      detail: envHasAny(envEntries, ["EXA_API_KEY", "PARALLEL_API_KEY", "FIRECRAWL_API_KEY", "TAVILY_API_KEY"])
        ? "Search credentials detected"
        : "No search-provider credentials detected",
    },
    { label: "voice output", value: voiceOutput, detail: "" },
    { label: "voice input", value: voiceInput, detail: "" },
    {
      label: "approvals",
      value: config.approvalsMode ?? "unknown",
      detail:
        config.compressionEnabled == null
          ? "Compression unknown"
          : `Compression ${config.compressionEnabled ? "enabled" : "disabled"}`,
    },
    {
      label: "security",
      value: config.tirithEnabled
        ? "tirith on"
        : config.tirithEnabled === false
          ? "tirith off"
          : "unknown",
      detail:
        config.redactSecrets == null
          ? "Secret redaction unknown"
          : `Redact secrets ${config.redactSecrets ? "on" : "off"}`,
    },
  ];
}

export function composeRuntimeOverview({
  installation,
  gateway,
  channels,
  update,
  config,
  memory,
  sessions,
  cron,
  status,
  doctor,
  envEntries,
}: {
  installation: {
    status: InventoryInstallationStatus;
    availableAgentCount: number;
    agents: Array<{ id: string }>;
  };
  gateway: GatewaySummary;
  channels: ChannelDirectorySummary;
  update: UpdateStatusSummary;
  config: ConfigPostureSummary;
  memory: {
    files: {
      memory: { pressureLevel: MemoryPressureLevel };
      user: { pressureLevel: MemoryPressureLevel };
    };
  };
  sessions: { sessions: Array<unknown> };
  cron: {
    jobs: Array<{
      statusTone: string;
      latestOutputState: string;
      attentionLevel: string;
      overdue: boolean;
      failureStreak: number;
    }>;
  };
  status?: StatusSnapshotSummary;
  doctor?: DoctorSnapshotSummary;
  envEntries?: Map<string, string>;
}): RuntimeOverviewSummary {
  const safeStatus: StatusSnapshotSummary = status ?? {
    capturedAt: null,
    apiKeys: [],
    authProviders: [],
    apiKeyProviders: [],
    messagingPlatforms: [],
    gatewayStatus: null,
    scheduledJobs: { active: null, total: null },
    sessions: { active: null },
  };
  const safeDoctor: DoctorSnapshotSummary = doctor ?? {
    capturedAt: null,
    issueCount: 0,
    issues: [],
    toolWarnings: [],
    authProviders: [],
  };
  const safeEnvEntries = envEntries ?? new Map<string, string>();
  const connectedPlatforms = Array.from(
    new Set([
      ...channels.connectedPlatforms,
      ...gateway.connectedPlatforms,
    ]),
  ).sort((left, right) => left.localeCompare(right));
  const configuredPlatforms =
    config.configuredPlatforms.length > 0
      ? config.configuredPlatforms
      : safeStatus.messagingPlatforms
          .filter((entry) => entry.state !== "not_configured")
          .map((entry) => entry.name.toLowerCase());
  const configuredPlatformCount =
    configuredPlatforms.length || channels.connectedPlatforms.length;
  const memoryPressure = getOverallMemoryPressureLevel(memory);
  const warnings = buildWarnings({
    update,
    doctor: safeDoctor,
    gateway,
    memoryPressure,
    cron,
  });
  const verdict = buildVerdict({
    gateway,
    installation,
    warnings,
    connectedPlatforms,
  });

  return {
    capturedAt:
      safeDoctor.capturedAt ?? safeStatus.capturedAt ?? gateway.updatedAt ?? null,
    verdict,
    warnings,
    runtimeHealth: buildRuntimeHealthItems({
      installation,
      gateway,
      update,
      doctor: safeDoctor,
      connectedPlatforms,
      configuredPlatformCount,
    }),
    platforms: buildPlatformSummaries({
      status: safeStatus,
      gateway,
      channels,
      config,
    }),
    access: {
      authProviders: buildAuthChecks(
        safeStatus.authProviders.length > 0
          ? safeStatus.authProviders
          : safeDoctor.authProviders,
      ),
      apiKeys: buildApiKeyChecks(safeEnvEntries),
    },
    runtimeProfile: buildRuntimeProfile(config, safeEnvEntries),
    activity: {
      sessionCount: sessions.sessions.length,
      cronAttentionJobs: cron.jobs.filter(
        (job) =>
          job.attentionLevel === "warning" ||
          job.attentionLevel === "critical",
      ).length,
      overdueCronJobs: cron.jobs.filter((job) => job.overdue).length,
      contentfulCronJobs: cron.jobs.filter(
        (job) => job.latestOutputState === "contentful",
      ).length,
      memoryPressure,
    },
    installStatus: installation.status,
    availableAgentCount: installation.availableAgentCount,
    totalAgentCount: installation.agents.length,
    gatewayState: gateway.state,
    gatewayUpdatedAt: gateway.updatedAt,
    connectedPlatforms,
    configuredPlatforms,
    configuredPlatformCount,
    updateBehind: update.behind,
    updateStatus: update.status,
    doctorIssueCount: safeDoctor.issueCount,
  };
}
