import path from 'node:path';
import { parse } from 'yaml';

import { nodeSkillsFileSystem } from '@/features/skills/node-skills-file-system';
import { readHermesSkillsResult } from '@/features/skills/read-skills';
import type { SkillDocumentDetail, SkillLinkedFileContent, SkillSummary } from '@hermes-console/runtime';

function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n');
}

function parseFrontmatter(rawContent: string) {
  const normalized = normalizeText(rawContent);

  if (!normalized.startsWith('---\n')) {
    return {
      frontmatter: {} as Record<string, unknown>,
      body: normalized.trim()
    };
  }

  const closingIndex = normalized.indexOf('\n---\n', 4);

  if (closingIndex === -1) {
    return {
      frontmatter: {} as Record<string, unknown>,
      body: normalized.trim()
    };
  }

  const parsedFrontmatter = (() => {
    try {
      return parse(normalized.slice(4, closingIndex)) as unknown;
    } catch {
      return null;
    }
  })();
  const frontmatter =
    parsedFrontmatter && typeof parsedFrontmatter === 'object' && !Array.isArray(parsedFrontmatter)
      ? (parsedFrontmatter as Record<string, unknown>)
      : {};

  return {
    frontmatter,
    body: normalized.slice(closingIndex + 5).trim()
  };
}

function readSkillSummary(skillId: string): SkillSummary | null {
  const index = readHermesSkillsResult().data;

  return index.skills.find((skill) => skill.id === skillId) ?? null;
}

export function readSkillDocumentDetail({ skillId }: { skillId: string }): SkillDocumentDetail | null {
  const summary = readSkillSummary(skillId);

  if (!summary) {
    return null;
  }

  const skillAbsolutePath = path.join(summary.source.rootPath, summary.skillPath);
  const rawContent = nodeSkillsFileSystem.readTextFile(skillAbsolutePath) ?? '';
  const parsed = parseFrontmatter(rawContent);

  return {
    summary,
    rawContent,
    body: parsed.body,
    frontmatter: parsed.frontmatter
  };
}

export function readSkillLinkedFileContent({
  linkedFileId,
  skillId
}: {
  linkedFileId: string;
  skillId: string;
}): SkillLinkedFileContent | null {
  const summary = readSkillSummary(skillId);

  if (!summary) {
    return null;
  }

  const selectedLinkedFile = summary.linkedFiles.find((linkedFile) => linkedFile.id === linkedFileId) ?? null;

  if (!selectedLinkedFile) {
    return null;
  }

  return {
    file: selectedLinkedFile,
    content: nodeSkillsFileSystem.readTextFile(selectedLinkedFile.absolutePath)
  };
}
