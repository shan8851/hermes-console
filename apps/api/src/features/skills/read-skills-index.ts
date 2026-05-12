import path from 'node:path';
import { parse } from 'yaml';

import { compareSkillCategories } from '@hermes-console/runtime';
import type {
  SkillLinkedFileKind,
  SkillLinkedFileSummary,
  SkillParseStatus,
  SkillReadinessStatus,
  SkillRequirementKind,
  SkillRequirementStatus,
  SkillRequirementSummary,
  SkillSourceSummary,
  SkillSummary,
  SkillsIndexResult
} from '@hermes-console/runtime';

export type SkillsFileSystem = {
  pathExists(targetPath: string): boolean;
  listDirectories(targetPath: string): string[];
  listFiles(targetPath: string): string[];
  readTextFile(targetPath: string): string | null;
};

export type SkillReadinessContext = {
  configKeys?: Set<string>;
  currentPlatform?: NodeJS.Platform;
  envKeys?: Set<string>;
};

const LINKED_DIRECTORY_KINDS: Record<string, SkillLinkedFileKind> = {
  references: 'reference',
  templates: 'template',
  scripts: 'script',
  assets: 'asset'
};

const PLATFORM_MAP: Record<string, string> = {
  linux: 'linux',
  macos: 'darwin',
  windows: 'win32'
};

const EMPTY_LINKED_FILE_COUNTS: Record<SkillLinkedFileKind, number> = {
  asset: 0,
  reference: 0,
  script: 0,
  template: 0
};

function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n');
}

function parseFrontmatter(rawContent: string) {
  const normalized = normalizeText(rawContent);

  if (!normalized.startsWith('---\n')) {
    return {
      body: normalized.trim(),
      frontmatter: {} as Record<string, unknown>,
      parseStatus: 'malformed' as SkillParseStatus
    };
  }

  const closingIndex = normalized.indexOf('\n---\n', 4);

  if (closingIndex === -1) {
    return {
      body: normalized.trim(),
      frontmatter: {} as Record<string, unknown>,
      parseStatus: 'malformed' as SkillParseStatus
    };
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const body = normalized.slice(closingIndex + 5).trim();
  const parsedFrontmatter = (() => {
    try {
      return parse(frontmatterBlock) as unknown;
    } catch {
      return null;
    }
  })();
  const frontmatter =
    parsedFrontmatter && typeof parsedFrontmatter === 'object' && !Array.isArray(parsedFrontmatter)
      ? (parsedFrontmatter as Record<string, unknown>)
      : {};

  return {
    body,
    frontmatter,
    parseStatus:
      typeof frontmatter.name === 'string' && typeof frontmatter.description === 'string'
        ? ('valid' as SkillParseStatus)
        : ('malformed' as SkillParseStatus)
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function getHermesMetadata(frontmatter: Record<string, unknown>) {
  const metadata = frontmatter.metadata;
  const metadataRecord =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
  const hermes = metadataRecord.hermes;

  return hermes && typeof hermes === 'object' && !Array.isArray(hermes) ? (hermes as Record<string, unknown>) : {};
}

function normalizeRequirementEntries({
  kind,
  names,
  required,
  resolveStatus
}: {
  kind: SkillRequirementKind;
  names: string[];
  required: boolean;
  resolveStatus: (name: string) => SkillRequirementStatus;
}): SkillRequirementSummary[] {
  return Array.from(new Set(names))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      kind,
      name,
      required,
      status: resolveStatus(name)
    }));
}

function extractRequiredEnvVars(frontmatter: Record<string, unknown>) {
  const raw = frontmatter.required_environment_variables;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return '';
      }

      const record = entry as Record<string, unknown>;
      return normalizeString(record.name);
    })
    .filter(Boolean);
}

function extractConfigKeys(hermesMetadata: Record<string, unknown>) {
  const raw = hermesMetadata.config;
  const entries = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return '';
      }

      return normalizeString((entry as Record<string, unknown>).key);
    })
    .filter(Boolean);
}

function extractCommandNames(frontmatter: Record<string, unknown>, hermesMetadata: Record<string, unknown>) {
  return [
    ...normalizeStringArray(frontmatter.required_commands),
    ...normalizeStringArray(hermesMetadata.required_commands)
  ];
}

function resolvePlatformCompatibility({
  currentPlatform,
  platforms
}: {
  currentPlatform: NodeJS.Platform;
  platforms: string[];
}) {
  if (platforms.length === 0) {
    return {
      platforms,
      currentPlatform,
      status: 'compatible' as const
    };
  }

  const isCompatible = platforms.some((platform) => {
    const normalized = platform.toLowerCase();
    const mappedPlatform = PLATFORM_MAP[normalized] ?? normalized;
    return currentPlatform.startsWith(mappedPlatform);
  });

  return {
    platforms,
    currentPlatform,
    status: isCompatible ? ('compatible' as const) : ('unsupported' as const)
  };
}

function countLinkedFilesByKind(linkedFiles: SkillLinkedFileSummary[]): Record<SkillLinkedFileKind, number> {
  return linkedFiles.reduce<Record<SkillLinkedFileKind, number>>(
    (counts, linkedFile) => ({
      ...counts,
      [linkedFile.kind]: counts[linkedFile.kind] + 1
    }),
    EMPTY_LINKED_FILE_COUNTS
  );
}

function deriveReadinessStatus({
  hasConditionalRequirements,
  hasMissingSetup,
  parseStatus,
  platformStatus
}: {
  hasConditionalRequirements: boolean;
  hasMissingSetup: boolean;
  parseStatus: SkillParseStatus;
  platformStatus: 'compatible' | 'unsupported' | 'unknown';
}): SkillReadinessStatus {
  if (parseStatus === 'malformed') {
    return 'parse_issue';
  }

  if (platformStatus === 'unsupported') {
    return 'unsupported';
  }

  if (hasMissingSetup) {
    return 'setup_needed';
  }

  if (hasConditionalRequirements) {
    return 'unknown';
  }

  return 'available';
}

function createReadinessSummary({
  context,
  frontmatter,
  linkedFiles,
  parseStatus
}: {
  context: SkillReadinessContext;
  frontmatter: Record<string, unknown>;
  linkedFiles: SkillLinkedFileSummary[];
  parseStatus: SkillParseStatus;
}): SkillSummary['readiness'] {
  const hermesMetadata = getHermesMetadata(frontmatter);
  const platforms = normalizeStringArray(frontmatter.platforms);
  const platform = resolvePlatformCompatibility({
    currentPlatform: context.currentPlatform ?? process.platform,
    platforms
  });
  const envKeys = context.envKeys ?? new Set<string>();
  const configKeys = context.configKeys ?? new Set<string>();
  const requiredToolsets = normalizeStringArray(hermesMetadata.requires_toolsets);
  const fallbackToolsets = normalizeStringArray(hermesMetadata.fallback_for_toolsets);
  const requiredTools = normalizeStringArray(hermesMetadata.requires_tools);
  const fallbackTools = normalizeStringArray(hermesMetadata.fallback_for_tools);
  const requirements = [
    ...normalizeRequirementEntries({
      kind: 'env',
      names: extractRequiredEnvVars(frontmatter),
      required: true,
      resolveStatus: (name) => (envKeys.has(name) ? 'present' : 'missing')
    }),
    ...normalizeRequirementEntries({
      kind: 'config',
      names: extractConfigKeys(hermesMetadata),
      required: true,
      resolveStatus: (name) => (configKeys.has(`skills.config.${name}`) ? 'present' : 'missing')
    }),
    ...normalizeRequirementEntries({
      kind: 'command',
      names: extractCommandNames(frontmatter, hermesMetadata),
      required: true,
      resolveStatus: () => 'unknown'
    }),
    ...normalizeRequirementEntries({
      kind: 'toolset',
      names: requiredToolsets,
      required: true,
      resolveStatus: () => 'unknown'
    }),
    ...normalizeRequirementEntries({
      kind: 'toolset',
      names: fallbackToolsets,
      required: false,
      resolveStatus: () => 'unknown'
    }),
    ...normalizeRequirementEntries({
      kind: 'tool',
      names: requiredTools,
      required: true,
      resolveStatus: () => 'unknown'
    }),
    ...normalizeRequirementEntries({
      kind: 'tool',
      names: fallbackTools,
      required: false,
      resolveStatus: () => 'unknown'
    })
  ];
  const hasMissingSetup = requirements.some((requirement) => requirement.required && requirement.status === 'missing');
  const hasConditionalRequirements =
    requirements.some((requirement) => requirement.kind === 'tool' || requirement.kind === 'toolset') ||
    requirements.some((requirement) => requirement.kind === 'command' && requirement.status === 'unknown');
  const status = deriveReadinessStatus({
    hasConditionalRequirements,
    hasMissingSetup,
    parseStatus,
    platformStatus: platform.status
  });
  const reasons = [
    parseStatus === 'malformed' ? 'SKILL.md frontmatter is missing required name or description metadata.' : null,
    platform.status === 'unsupported'
      ? `This skill declares ${platform.platforms.join(', ')} but this host is ${platform.currentPlatform}.`
      : null,
    hasMissingSetup ? 'One or more declared setup values are missing.' : null,
    status === 'unknown' ? 'This skill has command/tool activation requirements Hermes Console cannot verify.' : null
  ].filter((reason): reason is string => reason != null);

  return {
    status,
    reasons,
    platform,
    requirements,
    linkedFileCount: linkedFiles.length,
    linkedFilesByKind: countLinkedFilesByKind(linkedFiles)
  };
}

function collectLinkedFiles({
  skillRoot,
  relativeDirectory,
  kind,
  fileSystem
}: {
  skillRoot: string;
  relativeDirectory: string;
  kind: SkillLinkedFileKind;
  fileSystem: SkillsFileSystem;
}): SkillLinkedFileSummary[] {
  const absoluteDirectory = path.join(skillRoot, relativeDirectory);

  if (!fileSystem.pathExists(absoluteDirectory)) {
    return [];
  }

  const files = fileSystem.listFiles(absoluteDirectory).map((fileName) => ({
    id: `${relativeDirectory}/${fileName}`,
    kind,
    relativePath: `${relativeDirectory}/${fileName}`,
    absolutePath: path.join(absoluteDirectory, fileName)
  }));

  const nested = fileSystem.listDirectories(absoluteDirectory).flatMap((nestedDirectory) =>
    collectLinkedFiles({
      skillRoot,
      relativeDirectory: `${relativeDirectory}/${nestedDirectory}`,
      kind,
      fileSystem
    })
  );

  return [...files, ...nested].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function collectSkillDirectories({
  currentPath,
  relativePath,
  fileSystem
}: {
  currentPath: string;
  relativePath: string;
  fileSystem: SkillsFileSystem;
}): Array<{ skillRoot: string; relativePath: string }> {
  const files = fileSystem.listFiles(currentPath);

  if (files.includes('SKILL.md')) {
    return [{ skillRoot: currentPath, relativePath }];
  }

  return fileSystem
    .listDirectories(currentPath)
    .filter((directoryName) => !directoryName.startsWith('.'))
    .flatMap((directoryName) =>
      collectSkillDirectories({
        currentPath: path.join(currentPath, directoryName),
        relativePath: relativePath ? `${relativePath}/${directoryName}` : directoryName,
        fileSystem
      })
    );
}

function createSkillSummary({
  context = {},
  idPrefix,
  profileId,
  skillsRoot,
  skillRoot,
  relativePath,
  fileSystem,
  source
}: {
  context?: SkillReadinessContext;
  idPrefix?: string;
  profileId: string | null;
  skillsRoot: string;
  skillRoot: string;
  relativePath: string;
  fileSystem: SkillsFileSystem;
  source: SkillSourceSummary;
}): SkillSummary {
  const skillFilePath = path.join(skillRoot, 'SKILL.md');
  const rawContent = fileSystem.readTextFile(skillFilePath) ?? '';
  const parsed = parseFrontmatter(rawContent);
  const hermesMetadata = getHermesMetadata(parsed.frontmatter);
  const pathSegments = relativePath.split('/').filter(Boolean);
  const slug = pathSegments.at(-1) ?? path.basename(skillRoot);
  const category = normalizeString(hermesMetadata.category) || pathSegments.slice(0, -1).join('/') || 'uncategorized';

  const linkedFiles = Object.entries(LINKED_DIRECTORY_KINDS).flatMap(([directoryName, kind]) =>
    collectLinkedFiles({
      skillRoot,
      relativeDirectory: directoryName,
      kind,
      fileSystem
    })
  );
  const id = idPrefix ? `${idPrefix}:${relativePath}` : relativePath;

  return {
    id,
    slug,
    name: normalizeString(parsed.frontmatter.name) || slug,
    description: normalizeString(parsed.frontmatter.description) || 'No description found in SKILL.md.',
    category,
    tags: normalizeStringArray(hermesMetadata.tags),
    profileId,
    source,
    skillPath: path.relative(skillsRoot, skillFilePath),
    parseStatus: parsed.parseStatus,
    readiness: createReadinessSummary({
      context,
      frontmatter: parsed.frontmatter,
      linkedFiles,
      parseStatus: parsed.parseStatus
    }),
    linkedFiles
  };
}

export function readSkillsIndex({
  context = {},
  idPrefix,
  profileId = null,
  source,
  skillsRoot,
  fileSystem
}: {
  context?: SkillReadinessContext;
  idPrefix?: string;
  profileId?: string | null;
  source?: SkillSourceSummary;
  skillsRoot: string;
  fileSystem: SkillsFileSystem;
}): SkillsIndexResult {
  const sourceSummary =
    source ??
    ({
      agentId: profileId,
      kind: profileId == null || profileId === 'default' ? 'root' : 'profile',
      label: profileId == null || profileId === 'default' ? 'Default' : profileId,
      rootPath: skillsRoot
    } satisfies SkillSourceSummary);

  if (!fileSystem.pathExists(skillsRoot)) {
    return {
      skillsRoot,
      skills: []
    };
  }

  const skillDirectories = collectSkillDirectories({
    currentPath: skillsRoot,
    relativePath: '',
    fileSystem
  });

  const skills = skillDirectories
    .map(({ skillRoot, relativePath }) =>
      createSkillSummary({
        context,
        ...(idPrefix == null ? {} : { idPrefix }),
        profileId,
        skillsRoot,
        skillRoot,
        relativePath,
        fileSystem,
        source: sourceSummary
      })
    )
    .sort((left, right) => {
      const categoryCompare = compareSkillCategories(left.category, right.category);

      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      return left.name.localeCompare(right.name);
    });

  return {
    skillsRoot,
    skills
  };
}
