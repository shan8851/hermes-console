import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { readHermesCron } from "@/features/cron/read-hermes-cron";
import { readHermesInstallation } from "@/features/inventory/read-installation";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";
import { readHermesMemory } from "@/features/memory/read-memory";
import type { MemoryPressureLevel } from "@/features/memory/types";
import { readHermesSessions } from "@/features/sessions/read-hermes-sessions";
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
} from "@/features/runtime-overview/types";

const COMMAND_CACHE_TTL_MS = 1000 * 60 * 3;
const HERMES_BIN = process.env.HERMES_CONSOLE_HERMES_BIN || "hermes";
const commandCache = new Map<string, { capturedAt: number; output: string | null }>();

function normalizeDateString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeParseJson(rawContent: string) {
  try {
    return JSON.parse(rawContent) as unknown;
  } catch {
    return null;
  }
}

function flattenYaml(rawContent: string) {
  const result = new Map<string, string>();
  const stack: string[] = [];

  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(/\t/g, "    ");
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const depth = Math.floor(indent / 2);
    const match = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    stack.length = depth;
    stack[depth] = match[1];

    if (match[2]) {
      result.set(stack.slice(0, depth + 1).join("."), match[2]);
    }
  }

  return result;
}

function parseEnvAssignments(rawContent: string) {
  const entries = new Map<string, string>();

  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const value = match[2].trim().replace(/^['\"]|['\"]$/g, "");
    entries.set(match[1], value);
  }

  return entries;
}

function parseBoolean(value: string | null | undefined) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function parseInlineArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const match = value.match(/^\[(.*)\]$/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((item) => item.trim().replace(/^['\"]|['\"]$/g, ""))
    .filter(Boolean);
}

function getOverallMemoryPressureLevel(memory: { files: { memory: { pressureLevel: MemoryPressureLevel }; user: { pressureLevel: MemoryPressureLevel } } }) {
  if (memory.files.memory.pressureLevel === "at_limit" || memory.files.user.pressureLevel === "at_limit") {
    return "at_limit";
  }
  if (memory.files.memory.pressureLevel === "near_limit" || memory.files.user.pressureLevel === "near_limit") {
    return "near_limit";
  }
  if (memory.files.memory.pressureLevel === "approaching_limit" || memory.files.user.pressureLevel === "approaching_limit") {
    return "approaching_limit";
  }
  return "healthy";
}

function readTextFileIfExists(targetPath: string) {
  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isFile()) {
    return null;
  }

  return fs.readFileSync(targetPath, "utf8");
}

function runHermesCommandCached(args: string[]) {
  const key = args.join(" ");
  const cached = commandCache.get(key);
  const now = Date.now();

  if (cached && now - cached.capturedAt < COMMAND_CACHE_TTL_MS) {
    return cached.output;
  }

  try {
    const output = execFileSync(HERMES_BIN, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15000,
      env: process.env,
    });
    commandCache.set(key, { capturedAt: now, output });
    return output;
  } catch {
    commandCache.set(key, { capturedAt: now, output: null });
    return null;
  }
}

function parseStatusSymbol(symbol: string): StatusEntry["symbol"] {
  if (symbol === "✓") return "ok";
  if (symbol === "✗") return "error";
  if (symbol === "⚠") return "warn";
  return "unknown";
}

function parseStatusState(detail: string, symbol: StatusEntry["symbol"]): StatusEntry["state"] {
  const normalized = detail.toLowerCase();
  if (normalized.includes("not logged in")) return "not_logged_in";
  if (normalized.includes("logged in")) return "logged_in";
  if (normalized.includes("not configured")) return "not_configured";
  if (normalized.includes("configured")) return "configured";
  if (normalized.includes("not running")) return "not_running";
  if (normalized.includes("running")) return "running";
  if (normalized.includes("not set") || normalized.includes("missing")) return "missing";
  if (symbol === "ok") return "present";
  if (symbol === "warn") return "warning";
  if (symbol === "error") return "missing";
  return "unknown";
}

function parseStatusEntry(line: string) {
  const match = line.match(/^\s{2}(.+?)\s{2,}(✓|✗|⚠)\s+(.*)$/);
  if (!match) {
    return null;
  }

  const name = match[1].trim();
  const detail = match[3].trim();
  const symbol = parseStatusSymbol(match[2]);

  return {
    name,
    symbol,
    detail,
    state: parseStatusState(detail, symbol),
  } satisfies StatusEntry;
}

function parseNamedNumberPair(detail: string) {
  const match = detail.match(/(\d+)\s+active,\s+(\d+)\s+total/i);
  return match ? { active: Number(match[1]), total: Number(match[2]) } : { active: null, total: null };
}

export function parseStatusOutput(rawContent: string | null): StatusSnapshotSummary {
  const snapshot: StatusSnapshotSummary = {
    capturedAt: rawContent ? new Date().toISOString() : null,
    apiKeys: [],
    authProviders: [],
    apiKeyProviders: [],
    messagingPlatforms: [],
    gatewayStatus: null,
    scheduledJobs: { active: null, total: null },
    sessions: { active: null },
  };

  if (!rawContent) {
    return snapshot;
  }

  let currentSection = "";
  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(/\u001b\[[0-9;]*m/g, "");
    const headingMatch = line.match(/^◆\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      continue;
    }

    const entry = parseStatusEntry(line);
    if (entry) {
      if (currentSection === "API Keys") snapshot.apiKeys.push(entry);
      if (currentSection === "Auth Providers") snapshot.authProviders.push(entry);
      if (currentSection === "API-Key Providers") snapshot.apiKeyProviders.push(entry);
      if (currentSection === "Messaging Platforms") snapshot.messagingPlatforms.push(entry);
      continue;
    }

    const gatewayMatch = currentSection === "Gateway Service" ? line.match(/Status:\s+(✓|✗|⚠)\s+(.*)$/) : null;
    if (gatewayMatch) {
      const symbol = parseStatusSymbol(gatewayMatch[1]);
      const detail = gatewayMatch[2].trim();
      snapshot.gatewayStatus = {
        name: "Gateway",
        symbol,
        detail,
        state: parseStatusState(detail, symbol),
      };
    }

    if (currentSection === "Scheduled Jobs") {
      const jobsMatch = line.match(/^\s{2}Jobs:\s+(.*)$/);
      if (jobsMatch) snapshot.scheduledJobs = parseNamedNumberPair(jobsMatch[1].trim());
    }

    if (currentSection === "Sessions") {
      const sessionsMatch = line.match(/^\s{2}Active:\s+(\d+)/);
      if (sessionsMatch) snapshot.sessions.active = Number(sessionsMatch[1]);
    }
  }

  return snapshot;
}

export function parseDoctorOutput(rawContent: string | null): DoctorSnapshotSummary {
  const snapshot: DoctorSnapshotSummary = {
    capturedAt: rawContent ? new Date().toISOString() : null,
    issueCount: 0,
    issues: [],
    toolWarnings: [],
    authProviders: [],
  };

  if (!rawContent) {
    return snapshot;
  }

  let currentSection = "";
  let collectingIssues = false;
  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(/\u001b\[[0-9;]*m/g, "");
    const headingMatch = line.match(/^◆\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim();
      collectingIssues = false;
      continue;
    }

    const issueCountMatch = line.match(/Found\s+(\d+)\s+issue\(s\)\s+to\s+address:/i);
    if (issueCountMatch) {
      snapshot.issueCount = Number(issueCountMatch[1]);
      collectingIssues = true;
      continue;
    }

    if (collectingIssues) {
      const issueMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (issueMatch) {
        snapshot.issues.push(issueMatch[1].trim());
        continue;
      }
      if (line.trim() && !line.includes("Tip:")) {
        collectingIssues = false;
      }
    }

    const entry = parseStatusEntry(line);
    if (entry && currentSection === "Auth Providers") {
      snapshot.authProviders.push(entry);
    }

    if (currentSection === "External Tools" && line.includes("⚠")) {
      snapshot.toolWarnings.push(line.trim().replace(/^⚠\s*/, ""));
    }
  }

  return snapshot;
}

export function parseGatewayState(rawContent: string): GatewaySummary {
  const parsed = safeParseJson(rawContent);

  if (!parsed || typeof parsed !== "object") {
    return { state: "unknown", updatedAt: null, connectedPlatforms: [], platformStates: {} };
  }

  const record = parsed as Record<string, unknown>;
  const platforms = typeof record.platforms === "object" && record.platforms ? (record.platforms as Record<string, unknown>) : {};
  const platformStates = Object.fromEntries(
    Object.entries(platforms).map(([platform, value]) => {
      const state = typeof value === "object" && value && typeof (value as Record<string, unknown>).state === "string"
        ? ((value as Record<string, unknown>).state as string)
        : "unknown";
      return [platform, state];
    }),
  );

  return {
    state: record.gateway_state === "running" ? "running" : typeof record.gateway_state === "string" ? "stopped" : "unknown",
    updatedAt: normalizeDateString(typeof record.updated_at === "string" ? record.updated_at : null),
    connectedPlatforms: Object.entries(platformStates).filter(([, state]) => state === "connected").map(([platform]) => platform).sort((a, b) => a.localeCompare(b)),
    platformStates,
  };
}

export function parseChannelDirectory(rawContent: string): ChannelDirectorySummary {
  const parsed = safeParseJson(rawContent);

  if (!parsed || typeof parsed !== "object") {
    return { updatedAt: null, connectedPlatforms: [], totalConfiguredEntries: 0, platforms: {} };
  }

  const record = parsed as Record<string, unknown>;
  const platforms = typeof record.platforms === "object" && record.platforms ? (record.platforms as Record<string, unknown[]>) : {};
  const summaryPlatforms = Object.fromEntries(
    Object.entries(platforms).map(([platform, entries]) => {
      const safeEntries = Array.isArray(entries) ? entries : [];
      return [platform, { total: safeEntries.length, threads: safeEntries.filter((entry) => typeof entry === "object" && entry && (entry as Record<string, unknown>).type === "thread").length }];
    }),
  );

  return {
    updatedAt: normalizeDateString(typeof record.updated_at === "string" ? record.updated_at : null),
    connectedPlatforms: Object.entries(summaryPlatforms).filter(([, value]) => value.total > 0).map(([platform]) => platform).sort((a, b) => a.localeCompare(b)),
    totalConfiguredEntries: Object.values(summaryPlatforms).reduce((sum, value) => sum + value.total, 0),
    platforms: summaryPlatforms,
  };
}

export function parseUpdateStatus(rawContent: string): UpdateStatusSummary {
  const parsed = safeParseJson(rawContent);

  if (!parsed || typeof parsed !== "object") {
    return { checkedAt: null, behind: null, status: "unknown" };
  }

  const record = parsed as Record<string, unknown>;
  const behind = typeof record.behind === "number" ? record.behind : null;
  const checkedAt = typeof record.ts === "number" ? new Date(record.ts * 1000).toISOString() : null;

  return {
    checkedAt,
    behind,
    status: behind == null ? "unknown" : behind > 0 ? "behind" : "up_to_date",
  };
}

export function parseConfigPosture(rawContent: string): ConfigPostureSummary {
  const flat = flattenYaml(rawContent);
  const configuredPlatforms = Array.from(
    new Set(
      ["telegram", "discord", "whatsapp", "signal", "slack", "email", "sms", "dingtalk", "feishu", "wecom"].filter((platform) =>
        parseInlineArray(flat.get(`platform_toolsets.${platform}`)).length > 0,
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    model: flat.get("model.default") ?? null,
    provider: flat.get("model.provider") ?? null,
    webBackend: flat.get("web.backend") ?? null,
    terminalBackend: flat.get("terminal.backend") ?? null,
    ttsProvider: flat.get("tts.provider") ?? flat.get("speech.tts.provider") ?? null,
    sttProvider: flat.get("stt.provider") ?? flat.get("speech.stt.provider") ?? null,
    approvalsMode: flat.get("approvals.mode") ?? null,
    compressionEnabled: parseBoolean(flat.get("compression.enabled")),
    redactSecrets: parseBoolean(flat.get("security.redact_secrets")),
    tirithEnabled: parseBoolean(flat.get("security.tirith_enabled")),
    discordRequireMention: parseBoolean(flat.get("discord.require_mention")),
    discordAutoThread: parseBoolean(flat.get("discord.auto_thread")),
    configuredPlatforms,
  };
}

function summarizeCapabilityStatus(state: StatusEntry["state"], detail: string): AccessCheckSummary["status"] {
  if (["logged_in", "configured", "running", "present"].includes(state)) return "available";
  if (["missing", "not_configured", "not_logged_in", "not_running"].includes(state)) return "missing";
  if (state === "warning") return "warning";
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

function buildWarnings({ update, doctor, gateway, memoryPressure, cron }: { update: UpdateStatusSummary; doctor: DoctorSnapshotSummary; gateway: GatewaySummary; memoryPressure: MemoryPressureLevel; cron: { jobs: Array<{ statusTone: string; latestOutputState: string }> } }) {
  const warnings: OverviewWarning[] = [];

  if (gateway.state !== "running") {
    warnings.push({ id: "gateway-state", tone: "critical", title: "Gateway is not currently running", detail: "Hermes cannot deliver on connected messaging surfaces until the gateway comes back." });
  }

  if (update.status === "behind" && (update.behind ?? 0) > 0) {
    warnings.push({
      id: "update-behind",
      tone: "warning",
      title: `Hermes is ${update.behind} commit${update.behind === 1 ? "" : "s"} behind tracked upstream`,
      detail: "The local install is drifting from upstream and should be reviewed before it gets weirder.",
    });
  }

  if (doctor.issueCount > 0) {
    warnings.push(...doctor.issues.map((issue, index) => {
      const tone: OverviewWarning["tone"] = issue.toLowerCase().includes("vulnerability") ? "warning" : "info";
      return {
        id: `doctor-${index}`,
        tone,
        title: issue,
        detail: "Surfaced directly by `hermes doctor`.",
      };
    }));
  }

  if (memoryPressure === "near_limit" || memoryPressure === "at_limit") {
    warnings.push({
      id: "memory-pressure",
      tone: memoryPressure === "at_limit" ? "critical" : "warning",
      title: `Memory pressure is ${memoryPressure.replace(/_/g, " ")}`,
      detail: "At least one Hermes memory file is close to its configured limit.",
    });
  }

  const failingCronJobs = cron.jobs.filter((job) => job.statusTone === "error").length;
  if (failingCronJobs > 0) {
    warnings.push({ id: "cron-failing", tone: "warning", title: `${failingCronJobs} cron job${failingCronJobs === 1 ? "" : "s"} look unhealthy`, detail: "The most recent run state for one or more scheduled jobs is failing." });
  }

  return warnings;
}

function buildVerdict({ gateway, installation, warnings, connectedPlatforms }: { gateway: GatewaySummary; installation: { status: string; availableAgentCount: number; agents: Array<{ id: string }> }; warnings: OverviewWarning[]; connectedPlatforms: string[] }): OverviewVerdict {
  if (installation.availableAgentCount === 0 || gateway.state !== "running") {
    return { status: "broken", label: "Broken", summary: "Core runtime checks are failing. Hermes is not in a trustworthy operator state yet." };
  }

  if (warnings.some((warning) => warning.tone === "critical" || warning.tone === "warning")) {
    return {
      status: "needs_attention",
      label: "Needs attention",
      summary: `Gateway is ${gateway.state}, ${connectedPlatforms.length} surface${connectedPlatforms.length === 1 ? " is" : "s are"} live, but there are active warnings worth fixing.`,
    };
  }

  return { status: "solid", label: "Solid", summary: "Gateway, install posture, and connected surfaces all look coherent from this snapshot." };
}

function buildRuntimeHealthItems({ installation, gateway, update, doctor, connectedPlatforms, configuredPlatformCount }: { installation: { status: string; availableAgentCount: number; agents: Array<{ id: string }> }; gateway: GatewaySummary; update: UpdateStatusSummary; doctor: DoctorSnapshotSummary; connectedPlatforms: string[]; configuredPlatformCount: number }): RuntimeHealthItem[] {
  return [
    { label: "install", value: installation.status, detail: `${installation.availableAgentCount} of ${installation.agents.length} agents look usable.`, tone: installation.status === "ready" ? "healthy" : "warning" },
    { label: "gateway", value: gateway.state, detail: gateway.updatedAt ? `Last runtime snapshot ${new Date(gateway.updatedAt).toLocaleString()}` : "No runtime gateway snapshot found.", tone: gateway.state === "running" ? "healthy" : "critical" },
    { label: "surfaces live", value: `${connectedPlatforms.length} / ${configuredPlatformCount}`, detail: `${connectedPlatforms.length} live, ${configuredPlatformCount} configured.`, tone: connectedPlatforms.length > 0 ? "healthy" : "warning" },
    { label: "doctor issues", value: String(doctor.issueCount), detail: doctor.issueCount > 0 ? "Hermes doctor surfaced warnings worth reviewing." : "No active doctor issues in the latest snapshot.", tone: doctor.issueCount > 0 ? "warning" : "healthy" },
    { label: "update drift", value: update.status === "behind" ? `${update.behind} behind` : update.status === "up_to_date" ? "up to date" : "unknown", detail: update.checkedAt ? `Based on local update cache from ${new Date(update.checkedAt).toLocaleString()}.` : "No local update cache found.", tone: update.status === "behind" ? "warning" : update.status === "up_to_date" ? "healthy" : "default" },
  ];
}

function getPlatformDefaultSummary(platform: string, config: ConfigPostureSummary) {
  if (platform === "discord") {
    return [
      `mention ${config.discordRequireMention == null ? "unknown" : config.discordRequireMention ? "required" : "not required"}`,
      `auto-thread ${config.discordAutoThread == null ? "unknown" : config.discordAutoThread ? "enabled" : "disabled"}`,
    ];
  }
  return [];
}

function buildPlatformSummaries({ status, gateway, channels, config }: { status: StatusSnapshotSummary; gateway: GatewaySummary; channels: ChannelDirectorySummary; config: ConfigPostureSummary }): PlatformSurfaceSummary[] {
  const names = new Set<string>([
    ...status.messagingPlatforms.map((entry) => entry.name.toLowerCase()),
    ...Object.keys(gateway.platformStates),
    ...Object.keys(channels.platforms),
    ...config.configuredPlatforms,
  ]);

  return Array.from(names)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((platform) => {
      const statusEntry = status.messagingPlatforms.find((entry) => entry.name.toLowerCase() === platform);
      const liveState = gateway.platformStates[platform];
      const configured = statusEntry ? statusEntry.state !== "not_configured" : (channels.platforms[platform]?.total ?? 0) > 0 || config.configuredPlatforms.includes(platform);
      const live = liveState ? liveState === "connected" : configured ? false : null;
      const channelCount = channels.platforms[platform]?.total ?? 0;
      const detail = [
        statusEntry?.detail,
        channelCount > 0 ? `${channelCount} routed channel${channelCount === 1 ? "" : "s"}` : configured ? "No routed channels discovered" : null,
        liveState ? `gateway ${liveState}` : null,
      ].filter(Boolean).join(" · ") || "No current signal found.";

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
    { name: "Model access", detail: "OpenRouter or direct provider credentials are present for model calls.", vars: ["OPENROUTER_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GLM_API_KEY", "KIMI_API_KEY", "MINIMAX_API_KEY", "MINIMAX_CN_API_KEY"] },
    { name: "Voice access", detail: "Voice transcription / TTS credentials are present when using hosted voice providers.", vars: ["VOICE_TOOLS_OPENAI_KEY", "OPENAI_API_KEY", "ELEVENLABS_API_KEY"] },
    { name: "Search backend", detail: "At least one web/search provider credential is available.", vars: ["EXA_API_KEY", "PARALLEL_API_KEY", "FIRECRAWL_API_KEY", "TAVILY_API_KEY"] },
    { name: "Browser cloud", detail: "Browserbase credentials are available for hosted browser automation.", vars: ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID"] },
    { name: "GitHub", detail: "GitHub token is available for repo, PR, and higher-limit skills.", vars: ["GITHUB_TOKEN"] },
  ];

  return checks.map((check) => ({ name: check.name, status: envHasAny(envEntries, check.vars) ? "available" : "missing", detail: check.detail }));
}

function buildAuthChecks(entries: StatusEntry[]): AccessCheckSummary[] {
  return entries.map((entry) => ({ name: entry.name, status: summarizeCapabilityStatus(entry.state, entry.detail ?? ""), detail: entry.detail ?? "No detail returned by Hermes status." }));
}

function buildRuntimeProfile(config: ConfigPostureSummary, envEntries: Map<string, string>): RuntimeProfileItem[] {
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
    { label: "model", value: config.model ?? "unknown", detail: config.provider ?? "provider unknown" },
    { label: "search", value: config.webBackend ?? "unknown", detail: envHasAny(envEntries, ["EXA_API_KEY", "PARALLEL_API_KEY", "FIRECRAWL_API_KEY", "TAVILY_API_KEY"]) ? "Search credentials detected" : "No search-provider credentials detected" },
    { label: "voice output", value: voiceOutput, detail: "Capability-first posture rather than provider-specific trivia." },
    { label: "voice input", value: voiceInput, detail: "Shows whether Hermes can plausibly handle speech input on this install." },
    { label: "approvals", value: config.approvalsMode ?? "unknown", detail: config.compressionEnabled == null ? "Compression unknown" : `Compression ${config.compressionEnabled ? "enabled" : "disabled"}` },
    { label: "security", value: config.tirithEnabled ? "tirith on" : config.tirithEnabled === false ? "tirith off" : "unknown", detail: config.redactSecrets == null ? "Secret redaction unknown" : `Redact secrets ${config.redactSecrets ? "on" : "off"}` },
  ];
}

export function composeRuntimeOverview({ installation, gateway, channels, update, config, memory, sessions, cron, status, doctor, envEntries }: {
  installation: { status: string; availableAgentCount: number; agents: Array<{ id: string }> };
  gateway: GatewaySummary;
  channels: ChannelDirectorySummary;
  update: UpdateStatusSummary;
  config: ConfigPostureSummary;
  memory: { files: { memory: { pressureLevel: MemoryPressureLevel }; user: { pressureLevel: MemoryPressureLevel } } };
  sessions: { sessions: Array<unknown> };
  cron: { jobs: Array<{ statusTone: string; latestOutputState: string }> };
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
  const connectedPlatforms = Array.from(new Set([...channels.connectedPlatforms, ...gateway.connectedPlatforms])).sort((a, b) => a.localeCompare(b));
  const configuredPlatforms = config.configuredPlatforms.length > 0
    ? config.configuredPlatforms
    : safeStatus.messagingPlatforms.filter((entry) => entry.state !== "not_configured").map((entry) => entry.name.toLowerCase());
  const configuredPlatformCount = configuredPlatforms.length || channels.connectedPlatforms.length;
  const memoryPressure = getOverallMemoryPressureLevel(memory);
  const warnings = buildWarnings({ update, doctor: safeDoctor, gateway, memoryPressure, cron });
  const verdict = buildVerdict({ gateway, installation, warnings, connectedPlatforms });

  return {
    capturedAt: safeDoctor.capturedAt ?? safeStatus.capturedAt ?? gateway.updatedAt ?? null,
    verdict,
    warnings,
    runtimeHealth: buildRuntimeHealthItems({ installation, gateway, update, doctor: safeDoctor, connectedPlatforms, configuredPlatformCount }),
    platforms: buildPlatformSummaries({ status: safeStatus, gateway, channels, config }),
    access: {
      authProviders: buildAuthChecks(safeStatus.authProviders.length > 0 ? safeStatus.authProviders : safeDoctor.authProviders),
      apiKeys: buildApiKeyChecks(safeEnvEntries),
    },
    runtimeProfile: buildRuntimeProfile(config, safeEnvEntries),
    activity: {
      sessionCount: sessions.sessions.length,
      failingCronJobs: cron.jobs.filter((job) => job.statusTone === "error").length,
      contentfulCronJobs: cron.jobs.filter((job) => job.latestOutputState === "contentful").length,
      silentCronJobs: cron.jobs.filter((job) => job.latestOutputState === "silent").length,
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

export function readRuntimeOverview(): RuntimeOverviewSummary {
  const paths = resolveInventoryPathConfigFromEnv();
  const hermesRoot = paths.hermesRoot.path;

  const installation = readHermesInstallation();
  const memory = readHermesMemory();
  const sessions = readHermesSessions();
  const cron = readHermesCron();
  const gateway = parseGatewayState(readTextFileIfExists(path.join(hermesRoot, "gateway_state.json")) ?? "");
  const channels = parseChannelDirectory(readTextFileIfExists(path.join(hermesRoot, "channel_directory.json")) ?? "");
  const update = parseUpdateStatus(readTextFileIfExists(path.join(hermesRoot, ".update_check")) ?? "");
  const config = parseConfigPosture(readTextFileIfExists(path.join(hermesRoot, "config.yaml")) ?? "");
  const envEntries = parseEnvAssignments(readTextFileIfExists(path.join(hermesRoot, ".env")) ?? "");
  const status = parseStatusOutput(runHermesCommandCached(["status"]));
  const doctor = parseDoctorOutput(runHermesCommandCached(["doctor"]));

  return composeRuntimeOverview({
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
  });
}
