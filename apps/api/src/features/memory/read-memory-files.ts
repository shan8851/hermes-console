import path from 'node:path';
import { parse } from 'yaml';

import {
  DEFAULT_MEMORY_CHAR_LIMIT,
  DEFAULT_USER_CHAR_LIMIT,
  type MemoryEntry,
  type MemoryFileSummary,
  type MemoryLimitSummary,
  type MemoryProviderStatus,
  type MemoryProviderSummary,
  type MemoryPressureLevel,
  type MemoryReadResult,
  type MemoryStatusSummary,
  type MemoryScope
} from '@hermes-console/runtime';

export type MemoryFileSystem = {
  pathExists(targetPath: string): boolean;
  getLastModifiedMs(targetPath: string): number | null;
  readTextFile(targetPath: string): string | null;
};

const MEMORY_SECTION_NAME = 'memory';
const MEMORY_STALE_AFTER_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MEMORY_FILE_NAMES: Record<MemoryScope, string> = {
  memory: 'MEMORY.md',
  user: 'USER.md'
};
const KNOWN_MEMORY_PROVIDERS: Record<
  string,
  {
    description: string;
    requiredEnvVars: string[];
    optionalEnvVars: string[];
  }
> = {
  byterover: {
    description: 'ByteRover persistent knowledge tree via the brv CLI.',
    requiredEnvVars: [],
    optionalEnvVars: ['BRV_API_KEY']
  },
  hindsight: {
    description: 'Hindsight long-term memory with knowledge graph retrieval.',
    requiredEnvVars: [],
    optionalEnvVars: ['HINDSIGHT_API_KEY', 'HINDSIGHT_LLM_API_KEY']
  },
  holographic: {
    description: 'Local SQLite fact store with FTS5 search.',
    requiredEnvVars: [],
    optionalEnvVars: []
  },
  honcho: {
    description: 'Honcho AI-native cross-session user modeling.',
    requiredEnvVars: ['HONCHO_API_KEY'],
    optionalEnvVars: []
  },
  mem0: {
    description: 'Mem0 server-side fact extraction with semantic search.',
    requiredEnvVars: ['MEM0_API_KEY'],
    optionalEnvVars: []
  },
  openviking: {
    description: 'OpenViking context database with tiered retrieval.',
    requiredEnvVars: ['OPENVIKING_ENDPOINT'],
    optionalEnvVars: ['OPENVIKING_API_KEY', 'OPENVIKING_ACCOUNT', 'OPENVIKING_USER', 'OPENVIKING_AGENT']
  },
  retaindb: {
    description: 'RetainDB cloud memory API with hybrid search.',
    requiredEnvVars: ['RETAINDB_API_KEY'],
    optionalEnvVars: []
  },
  supermemory: {
    description: 'Supermemory semantic long-term memory.',
    requiredEnvVars: ['SUPERMEMORY_API_KEY'],
    optionalEnvVars: []
  }
};

function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n');
}

function parseYamlRecord(rawContent: string): Record<string, unknown> {
  try {
    const parsed = parse(rawContent) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readMemoryConfig(configText: string) {
  const parsed = parseYamlRecord(configText);
  const memoryConfig = parsed.memory;

  return memoryConfig && typeof memoryConfig === 'object' && !Array.isArray(memoryConfig)
    ? (memoryConfig as Record<string, unknown>)
    : {};
}

function parseEnvKeys(rawContent: string) {
  return new Set(
    normalizeText(rawContent)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=/)?.[1] ?? '')
      .filter(Boolean)
  );
}

function parseConfiguredLimit({
  configText,
  key
}: {
  configText: string;
  key: 'memory_char_limit' | 'user_char_limit';
}) {
  const lines = normalizeText(configText).split('\n');
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
  fallback
}: {
  configuredLimit: number | null;
  fallback: number;
}): MemoryLimitSummary {
  if (typeof configuredLimit === 'number' && Number.isFinite(configuredLimit)) {
    return {
      value: configuredLimit,
      source: 'config'
    };
  }

  return {
    value: fallback,
    source: 'default'
  };
}

function derivePressureLevel(usageRatio: number): MemoryPressureLevel {
  if (usageRatio >= 1) {
    return 'at_limit';
  }

  if (usageRatio >= 0.9) {
    return 'near_limit';
  }

  if (usageRatio >= 0.75) {
    return 'approaching_limit';
  }

  return 'healthy';
}

function toUsagePercentage(charCount: number, limit: number) {
  if (limit <= 0) {
    return 0;
  }

  return Math.round((charCount / limit) * 100);
}

function createEntries({ scope, entryBlocks }: { scope: MemoryScope; entryBlocks: string[] }): MemoryEntry[] {
  return entryBlocks.map((entryContent, index) => ({
    id: `${scope}-${index + 1}`,
    content: entryContent,
    charCount: entryContent.length
  }));
}

function parseMemoryContent({ scope, rawContent }: { scope: MemoryScope; rawContent: string }) {
  const normalized = normalizeText(rawContent).trim();

  if (!normalized) {
    return {
      preamble: '',
      entries: [] as MemoryEntry[]
    };
  }

  const segments = normalized
    .split(/\n§\s*\n/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return {
      preamble: '',
      entries: [] as MemoryEntry[]
    };
  }

  const firstSegment = segments[0] ?? '';
  const hasPreamble = scope === 'memory' && firstSegment.startsWith('# MEMORY.md');
  const preamble = hasPreamble ? firstSegment : '';
  const entryBlocks = hasPreamble ? segments.slice(1) : segments;

  return {
    preamble,
    entries: createEntries({ scope, entryBlocks })
  };
}

function buildMemoryFileSummary({
  scope,
  hermesRoot,
  fileSystem,
  limit
}: {
  scope: MemoryScope;
  hermesRoot: string;
  fileSystem: MemoryFileSystem;
  limit: number;
}): MemoryFileSummary {
  const filePath = path.join(hermesRoot, 'memories', MEMORY_FILE_NAMES[scope]);
  const rawContent = fileSystem.readTextFile(filePath) ?? '';
  const exists = fileSystem.pathExists(filePath);
  const lastModifiedMs = exists ? fileSystem.getLastModifiedMs(filePath) : null;
  const { preamble, entries } = parseMemoryContent({ scope, rawContent });
  const charCount = normalizeText(rawContent).trim().length;
  const usageRatio = limit > 0 ? charCount / limit : 0;

  return {
    scope,
    label: scope === 'memory' ? 'MEMORY' : 'USER',
    filePath,
    exists,
    lastModifiedMs,
    rawContent,
    preamble,
    entries,
    charCount,
    limit,
    usageRatio,
    usagePercentage: toUsagePercentage(charCount, limit),
    pressureLevel: derivePressureLevel(usageRatio)
  };
}

function deriveReadStatus(memoryExists: boolean, userExists: boolean): MemoryReadResult['status'] {
  if (memoryExists && userExists) {
    return 'ready';
  }

  if (memoryExists || userExists) {
    return 'partial';
  }

  return 'missing';
}

function getLatestModifiedMs(files: MemoryReadResult['files']) {
  return (
    [files.memory.lastModifiedMs, files.user.lastModifiedMs]
      .filter((value): value is number => typeof value === 'number')
      .sort((left, right) => right - left)[0] ?? null
  );
}

function hasMemoryPressure(files: MemoryReadResult['files']) {
  return files.memory.pressureLevel !== 'healthy' || files.user.pressureLevel !== 'healthy';
}

function deriveStatusSummary({
  files,
  readStatus
}: {
  files: MemoryReadResult['files'];
  readStatus: MemoryReadResult['status'];
}): MemoryStatusSummary {
  const latestModifiedMs = getLatestModifiedMs(files);
  const staleCutoffMs = Date.now() - MEMORY_STALE_AFTER_DAYS * MILLISECONDS_PER_DAY;

  if (readStatus === 'missing') {
    return {
      level: 'missing',
      label: 'Missing',
      detail: 'Neither MEMORY.md nor USER.md exists under this agent root.',
      latestModifiedMs,
      staleAfterDays: MEMORY_STALE_AFTER_DAYS
    };
  }

  if (hasMemoryPressure(files)) {
    return {
      level: 'pressured',
      label: 'Pressured',
      detail: 'At least one built-in memory file is above its healthy usage band.',
      latestModifiedMs,
      staleAfterDays: MEMORY_STALE_AFTER_DAYS
    };
  }

  if (latestModifiedMs != null && latestModifiedMs < staleCutoffMs) {
    return {
      level: 'stale',
      label: 'Stale',
      detail: `No built-in memory file has changed in the last ${MEMORY_STALE_AFTER_DAYS} days.`,
      latestModifiedMs,
      staleAfterDays: MEMORY_STALE_AFTER_DAYS
    };
  }

  return {
    level: 'healthy',
    label: 'Healthy',
    detail: 'Built-in memory files are present and within their configured character limits.',
    latestModifiedMs,
    staleAfterDays: MEMORY_STALE_AFTER_DAYS
  };
}

function normalizeConfiguredProvider(memoryConfig: Record<string, unknown>) {
  const provider = typeof memoryConfig.provider === 'string' ? memoryConfig.provider.trim() : '';
  return provider && provider !== 'builtin' ? provider : null;
}

function resolveProviderStatus({
  configuredProvider,
  missingRequiredEnvVars
}: {
  configuredProvider: string | null;
  missingRequiredEnvVars: string[];
}): MemoryProviderStatus {
  if (!configuredProvider) {
    return 'built_in_only';
  }

  if (!KNOWN_MEMORY_PROVIDERS[configuredProvider]) {
    return 'provider_missing';
  }

  return missingRequiredEnvVars.length > 0 ? 'setup_needed' : 'configured';
}

function deriveProviderSummary({
  configText,
  envText
}: {
  configText: string;
  envText: string;
}): MemoryProviderSummary {
  const memoryConfig = readMemoryConfig(configText);
  const configuredProvider = normalizeConfiguredProvider(memoryConfig);
  const providerMetadata = configuredProvider ? KNOWN_MEMORY_PROVIDERS[configuredProvider] : null;
  const envKeys = new Set([...Array.from(parseEnvKeys(envText)), ...Object.keys(process.env)]);
  const requiredEnvVars = providerMetadata?.requiredEnvVars ?? [];
  const optionalEnvVars = providerMetadata?.optionalEnvVars ?? [];
  const missingRequiredEnvVars = requiredEnvVars.filter((envVar) => !envKeys.has(envVar));

  if (!configuredProvider) {
    return {
      kind: 'built_in_only',
      name: 'Built-in markdown',
      status: 'built_in_only',
      description: 'Hermes built-in MEMORY.md and USER.md files are always available when present.',
      configuredProvider: null,
      requirements: []
    };
  }

  return {
    kind: 'external',
    name: configuredProvider,
    status: resolveProviderStatus({
      configuredProvider,
      missingRequiredEnvVars
    }),
    description: providerMetadata?.description ?? null,
    configuredProvider,
    requirements: [...requiredEnvVars, ...optionalEnvVars].map((envVar) => ({
      envVar,
      required: requiredEnvVars.includes(envVar),
      status: envKeys.has(envVar) ? ('present' as const) : ('missing' as const)
    }))
  };
}

export function readMemoryFiles({
  hermesRoot,
  fileSystem
}: {
  hermesRoot: string;
  fileSystem: MemoryFileSystem;
}): MemoryReadResult {
  const configPath = path.join(hermesRoot, 'config.yaml');
  const envPath = path.join(hermesRoot, '.env');
  const configText = fileSystem.readTextFile(configPath) ?? '';
  const envText = fileSystem.readTextFile(envPath) ?? '';

  const limits = {
    memory: resolveLimitSummary({
      configuredLimit: parseConfiguredLimit({
        configText,
        key: 'memory_char_limit'
      }),
      fallback: DEFAULT_MEMORY_CHAR_LIMIT
    }),
    user: resolveLimitSummary({
      configuredLimit: parseConfiguredLimit({
        configText,
        key: 'user_char_limit'
      }),
      fallback: DEFAULT_USER_CHAR_LIMIT
    })
  };

  const files = {
    memory: buildMemoryFileSummary({
      scope: 'memory',
      hermesRoot,
      fileSystem,
      limit: limits.memory.value
    }),
    user: buildMemoryFileSummary({
      scope: 'user',
      hermesRoot,
      fileSystem,
      limit: limits.user.value
    })
  };
  const status = deriveReadStatus(files.memory.exists, files.user.exists);

  return {
    status,
    rootPath: hermesRoot,
    configPath,
    provider: deriveProviderSummary({
      configText,
      envText
    }),
    statusSummary: deriveStatusSummary({
      files,
      readStatus: status
    }),
    limits,
    files
  };
}
