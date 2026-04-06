import path from "node:path";

import {
  DEFAULT_MEMORY_CHAR_LIMIT,
  DEFAULT_USER_CHAR_LIMIT,
  type MemoryEntry,
  type MemoryFileSummary,
  type MemoryLimitSummary,
  type MemoryPressureLevel,
  type MemoryReadResult,
  type MemoryScope,
} from "@hermes-console/runtime";

export type MemoryFileSystem = {
  pathExists(targetPath: string): boolean;
  readTextFile(targetPath: string): string | null;
};

const MEMORY_SECTION_NAME = "memory";
const MEMORY_FILE_NAMES: Record<MemoryScope, string> = {
  memory: "MEMORY.md",
  user: "USER.md",
};

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function parseConfiguredLimit({
  configText,
  key,
}: {
  configText: string;
  key: "memory_char_limit" | "user_char_limit";
}) {
  const lines = normalizeText(configText).split("\n");
  let inMemorySection = false;

  for (const line of lines) {
    const sectionMatch = line.match(/^(\S[^:]*):\s*$/);

    if (sectionMatch) {
      inMemorySection = sectionMatch[1] === MEMORY_SECTION_NAME;
      continue;
    }

    if (!inMemorySection) {
      continue;
    }

    const limitMatch = line.match(new RegExp(`^\\s{2,}${key}:\\s*(\\d+)\\s*$`));

    if (limitMatch) {
      return Number(limitMatch[1]);
    }
  }

  return null;
}

function resolveLimitSummary({
  configuredLimit,
  fallback,
}: {
  configuredLimit: number | null;
  fallback: number;
}): MemoryLimitSummary {
  if (typeof configuredLimit === "number" && Number.isFinite(configuredLimit)) {
    return {
      value: configuredLimit,
      source: "config",
    };
  }

  return {
    value: fallback,
    source: "default",
  };
}

function derivePressureLevel(usageRatio: number): MemoryPressureLevel {
  if (usageRatio >= 1) {
    return "at_limit";
  }

  if (usageRatio >= 0.9) {
    return "near_limit";
  }

  if (usageRatio >= 0.75) {
    return "approaching_limit";
  }

  return "healthy";
}

function toUsagePercentage(charCount: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }

  return Math.round((charCount / limit) * 100);
}

function createEntries({
  scope,
  entryBlocks,
}: {
  scope: MemoryScope;
  entryBlocks: string[];
}): MemoryEntry[] {
  return entryBlocks.map((entryContent, index) => ({
    id: `${scope}-${index + 1}`,
    content: entryContent,
    charCount: entryContent.length,
  }));
}

function parseMemoryContent({
  scope,
  rawContent,
}: {
  scope: MemoryScope;
  rawContent: string;
}) {
  const normalized = normalizeText(rawContent).trim();

  if (!normalized) {
    return {
      preamble: "",
      entries: [] as MemoryEntry[],
    };
  }

  const segments = normalized
    .split(/\n§\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return {
      preamble: "",
      entries: [] as MemoryEntry[],
    };
  }

  const firstSegment = segments[0] ?? "";
  const hasPreamble = scope === "memory" && firstSegment.startsWith("# MEMORY.md");
  const preamble = hasPreamble ? firstSegment : "";
  const entryBlocks = hasPreamble ? segments.slice(1) : segments;

  return {
    preamble,
    entries: createEntries({ scope, entryBlocks }),
  };
}

function buildMemoryFileSummary({
  scope,
  hermesRoot,
  fileSystem,
  limit,
}: {
  scope: MemoryScope;
  hermesRoot: string;
  fileSystem: MemoryFileSystem;
  limit: number;
}): MemoryFileSummary {
  const filePath = path.join(hermesRoot, "memories", MEMORY_FILE_NAMES[scope]);
  const rawContent = fileSystem.readTextFile(filePath) ?? "";
  const exists = fileSystem.pathExists(filePath);
  const { preamble, entries } = parseMemoryContent({ scope, rawContent });
  const charCount = normalizeText(rawContent).trim().length;
  const usageRatio = limit > 0 ? charCount / limit : 0;

  return {
    scope,
    label: scope === "memory" ? "MEMORY" : "USER",
    filePath,
    exists,
    rawContent,
    preamble,
    entries,
    charCount,
    limit,
    usageRatio,
    usagePercentage: toUsagePercentage(charCount, limit),
    pressureLevel: derivePressureLevel(usageRatio),
  };
}

function deriveReadStatus(memoryExists: boolean, userExists: boolean): MemoryReadResult["status"] {
  if (memoryExists && userExists) {
    return "ready";
  }

  if (memoryExists || userExists) {
    return "partial";
  }

  return "missing";
}

export function readMemoryFiles({
  hermesRoot,
  fileSystem,
}: {
  hermesRoot: string;
  fileSystem: MemoryFileSystem;
}): MemoryReadResult {
  const configPath = path.join(hermesRoot, "config.yaml");
  const configText = fileSystem.readTextFile(configPath) ?? "";

  const limits = {
    memory: resolveLimitSummary({
      configuredLimit: parseConfiguredLimit({
        configText,
        key: "memory_char_limit",
      }),
      fallback: DEFAULT_MEMORY_CHAR_LIMIT,
    }),
    user: resolveLimitSummary({
      configuredLimit: parseConfiguredLimit({
        configText,
        key: "user_char_limit",
      }),
      fallback: DEFAULT_USER_CHAR_LIMIT,
    }),
  };

  const files = {
    memory: buildMemoryFileSummary({
      scope: "memory",
      hermesRoot,
      fileSystem,
      limit: limits.memory.value,
    }),
    user: buildMemoryFileSummary({
      scope: "user",
      hermesRoot,
      fileSystem,
      limit: limits.user.value,
    }),
  };

  return {
    status: deriveReadStatus(files.memory.exists, files.user.exists),
    rootPath: hermesRoot,
    configPath,
    limits,
    files,
  };
}
