import path from 'node:path';
import { parse } from 'yaml';

import { nodeSkillsFileSystem } from '@/features/skills/node-skills-file-system';
import { readSkillsIndex } from '@/features/skills/read-skills-index';
import { readHermesInstallationResult } from '@/features/inventory/read-installation';
import { createUnreadablePathIssue } from '@/lib/query-issue-factories';
import { createReadResult } from '@/lib/read-result';
import { parseEnvAssignments } from '@hermes-console/runtime';
import type { HermesAgentIdentity, SkillSourceSummary, SkillSummary } from '@hermes-console/runtime';

function parseYamlRecord(rawContent: string): Record<string, unknown> {
  try {
    const parsed = parse(rawContent) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child) ? flattenKeys(child, nextPrefix) : [nextPrefix];
  });
}

function readContextForAgent(agent: HermesAgentIdentity) {
  const configPath = path.join(agent.rootPath, 'config.yaml');
  const envPath = path.join(agent.rootPath, '.env');
  const configText = nodeSkillsFileSystem.readTextFile(configPath) ?? '';
  const envText = nodeSkillsFileSystem.readTextFile(envPath) ?? '';

  return {
    configKeys: new Set(flattenKeys(parseYamlRecord(configText))),
    envKeys: new Set(Array.from(parseEnvAssignments(envText).keys()))
  };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeExternalDirs(rawValue: unknown) {
  if (typeof rawValue === 'string') {
    return [rawValue];
  }

  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue.map((value) => normalizeString(value)).filter(Boolean);
}

function resolveExternalSkillDirs(agent: HermesAgentIdentity) {
  const configText = nodeSkillsFileSystem.readTextFile(path.join(agent.rootPath, 'config.yaml')) ?? '';
  const config = parseYamlRecord(configText);
  const skillsConfig = config.skills;
  const rawExternalDirs =
    skillsConfig && typeof skillsConfig === 'object' && !Array.isArray(skillsConfig)
      ? (skillsConfig as Record<string, unknown>).external_dirs
      : null;
  const localSkillsRoot = path.join(agent.rootPath, 'skills');

  return normalizeExternalDirs(rawExternalDirs)
    .filter((entry) => !entry.includes('${'))
    .map((entry) => {
      const expandedHome = entry.startsWith('~/') ? path.join(process.env.HOME ?? '', entry.slice(2)) : entry;
      return path.isAbsolute(expandedHome) ? expandedHome : path.resolve(agent.rootPath, expandedHome);
    })
    .filter(
      (externalDir, index, externalDirs) =>
        externalDir !== localSkillsRoot && externalDirs.indexOf(externalDir) === index
    )
    .filter((externalDir) => nodeSkillsFileSystem.pathExists(externalDir));
}

function readSkillsForSource({
  agent,
  idPrefix,
  skillsRoot,
  source
}: {
  agent: HermesAgentIdentity;
  idPrefix?: string;
  skillsRoot: string;
  source: SkillSourceSummary;
}) {
  const context = readContextForAgent(agent);

  return readSkillsIndex({
    context,
    fileSystem: nodeSkillsFileSystem,
    ...(idPrefix == null ? {} : { idPrefix }),
    profileId: agent.id,
    skillsRoot,
    source
  }).skills;
}

function dedupeSkills(skills: SkillSummary[]) {
  const seenIds = new Set<string>();

  return skills.filter((skill) => {
    if (seenIds.has(skill.id)) {
      return false;
    }

    seenIds.add(skill.id);
    return true;
  });
}

export function readHermesSkillsResult() {
  const installation = readHermesInstallationResult();
  const skillsRoot = path.join(installation.data.paths.hermesRoot.path, 'skills');

  try {
    const skills = installation.data.agents.flatMap((agent) => {
      if (!agent.isAvailable) {
        return [];
      }

      const localSkillsRoot = path.join(agent.rootPath, 'skills');
      const localSkills = readSkillsForSource({
        agent,
        ...(agent.id === 'default' ? {} : { idPrefix: `profile:${agent.id}` }),
        skillsRoot: localSkillsRoot,
        source: {
          agentId: agent.id,
          kind: agent.source === 'root' ? 'root' : 'profile',
          label: agent.label,
          rootPath: localSkillsRoot
        }
      });
      const externalSkills = resolveExternalSkillDirs(agent).flatMap((externalDir, index) =>
        readSkillsForSource({
          agent,
          idPrefix: `external:${agent.id}:${index}`,
          skillsRoot: externalDir,
          source: {
            agentId: agent.id,
            kind: 'external',
            label: `${agent.label} external ${index + 1}`,
            rootPath: externalDir
          }
        })
      );

      return [...localSkills, ...externalSkills];
    });

    return createReadResult({
      data: {
        skillsRoot,
        skills: dedupeSkills(skills).sort((left, right) => {
          const categoryCompare = left.category.localeCompare(right.category);

          if (categoryCompare !== 0) {
            return categoryCompare;
          }

          return left.name.localeCompare(right.name);
        })
      }
    });
  } catch (error) {
    return createReadResult({
      data: {
        skillsRoot,
        skills: []
      },
      issues: [
        createUnreadablePathIssue({
          id: 'skills-read-failed',
          summary: 'Skills could not be read',
          detail: error instanceof Error ? error.message : 'Hermes Console could not read the Hermes skills directory.',
          path: skillsRoot
        })
      ]
    });
  }
}
