import type {
  ChannelDirectorySummary,
  ConfigPostureSummary,
  GatewaySummary,
  UpdateStatusSummary,
} from "./types.js";

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

    const key = match[1];

    if (!key) {
      continue;
    }

    stack.length = depth;
    stack[depth] = key;

    if (match[2]) {
      result.set(stack.slice(0, depth + 1).join("."), match[2]);
    }
  }

  return result;
}

export function parseEnvAssignments(rawContent: string) {
  const entries = new Map<string, string>();

  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/,
    );
    if (!match) {
      continue;
    }

    const entryKey = match[1];
    const entryValue = match[2];

    if (!entryKey || entryValue == null) {
      continue;
    }

    const value = entryValue.trim().replace(/^['"]|['"]$/g, "");
    entries.set(entryKey, value);
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

  const content = match[1];

  if (content == null) {
    return [];
  }

  return content
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

export function parseGatewayState(rawContent: string): GatewaySummary {
  const parsed = safeParseJson(rawContent);

  if (!parsed || typeof parsed !== "object") {
    return {
      state: "unknown",
      updatedAt: null,
      connectedPlatforms: [],
      platformStates: {},
    };
  }

  const record = parsed as Record<string, unknown>;
  const platforms =
    typeof record.platforms === "object" && record.platforms
      ? (record.platforms as Record<string, unknown>)
      : {};
  const platformStates = Object.fromEntries(
    Object.entries(platforms).map(([platform, value]) => {
      const state =
        typeof value === "object" &&
        value &&
        typeof (value as Record<string, unknown>).state === "string"
          ? ((value as Record<string, unknown>).state as string)
          : "unknown";
      return [platform, state];
    }),
  );

  return {
    state:
      record.gateway_state === "running"
        ? "running"
        : typeof record.gateway_state === "string"
          ? "stopped"
          : "unknown",
    updatedAt: normalizeDateString(
      typeof record.updated_at === "string" ? record.updated_at : null,
    ),
    connectedPlatforms: Object.entries(platformStates)
      .filter(([, state]) => state === "connected")
      .map(([platform]) => platform)
      .sort((left, right) => left.localeCompare(right)),
    platformStates,
  };
}

export function parseChannelDirectory(
  rawContent: string,
): ChannelDirectorySummary {
  const parsed = safeParseJson(rawContent);

  if (!parsed || typeof parsed !== "object") {
    return {
      updatedAt: null,
      connectedPlatforms: [],
      totalConfiguredEntries: 0,
      platforms: {},
    };
  }

  const record = parsed as Record<string, unknown>;
  const platforms =
    typeof record.platforms === "object" && record.platforms
      ? (record.platforms as Record<string, unknown[]>)
      : {};
  const summaryPlatforms = Object.fromEntries(
    Object.entries(platforms).map(([platform, entries]) => {
      const safeEntries = Array.isArray(entries) ? entries : [];
      return [
        platform,
        {
          total: safeEntries.length,
          threads: safeEntries.filter(
            (entry) =>
              typeof entry === "object" &&
              entry &&
              (entry as Record<string, unknown>).type === "thread",
          ).length,
        },
      ];
    }),
  );

  return {
    updatedAt: normalizeDateString(
      typeof record.updated_at === "string" ? record.updated_at : null,
    ),
    connectedPlatforms: Object.entries(summaryPlatforms)
      .filter(([, value]) => value.total > 0)
      .map(([platform]) => platform)
      .sort((left, right) => left.localeCompare(right)),
    totalConfiguredEntries: Object.values(summaryPlatforms).reduce(
      (sum, value) => sum + value.total,
      0,
    ),
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
  const checkedAt =
    typeof record.ts === "number"
      ? new Date(record.ts * 1000).toISOString()
      : null;

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
      [
        "telegram",
        "discord",
        "whatsapp",
        "signal",
        "slack",
        "email",
        "sms",
        "dingtalk",
        "feishu",
        "wecom",
      ].filter(
        (platform) =>
          parseInlineArray(flat.get(`platform_toolsets.${platform}`)).length > 0,
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

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
