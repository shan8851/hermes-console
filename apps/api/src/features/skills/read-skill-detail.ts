import path from "node:path";

import { nodeSkillsFileSystem } from "@/features/skills/node-skills-file-system";
import { readSkillsIndex } from "@/features/skills/read-skills-index";
import type {
  SkillDocumentDetail,
  SkillLinkedFileContent,
  SkillSummary,
} from "@hermes-console/runtime";
import { resolveInventoryPathConfigFromEnv } from "@/features/inventory/resolve-path-config";

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, "").trim();
}

function parseFrontmatter(rawContent: string) {
  const normalized = normalizeText(rawContent);

  if (!normalized.startsWith("---\n")) {
    return {
      frontmatter: {} as Record<string, string>,
      body: normalized.trim(),
    };
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);

  if (closingIndex === -1) {
    return {
      frontmatter: {} as Record<string, string>,
      body: normalized.trim(),
    };
  }

  const frontmatter: Record<string, string> = {};

  for (const line of normalized.slice(4, closingIndex).split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);

    if (!match) {
      continue;
    }

    const frontmatterKey = match[1];
    const frontmatterValue = match[2];

    if (!frontmatterKey || frontmatterValue == null) {
      continue;
    }

    frontmatter[frontmatterKey] = stripQuotes(frontmatterValue);
  }

  return {
    frontmatter,
    body: normalized.slice(closingIndex + 5).trim(),
  };
}

function readSkillSummary(skillId: string): SkillSummary | null {
  const paths = resolveInventoryPathConfigFromEnv();
  const skillsRoot = path.join(paths.hermesRoot.path, "skills");
  const index = readSkillsIndex({
    skillsRoot,
    fileSystem: nodeSkillsFileSystem,
  });

  return index.skills.find((skill) => skill.id === skillId) ?? null;
}

export function readSkillDocumentDetail({
  skillId,
}: {
  skillId: string;
}): SkillDocumentDetail | null {
  const paths = resolveInventoryPathConfigFromEnv();
  const skillsRoot = path.join(paths.hermesRoot.path, "skills");
  const summary = readSkillSummary(skillId);

  if (!summary) {
    return null;
  }

  const skillAbsolutePath = path.join(skillsRoot, summary.skillPath);
  const rawContent = nodeSkillsFileSystem.readTextFile(skillAbsolutePath) ?? "";
  const parsed = parseFrontmatter(rawContent);

  return {
    summary,
    rawContent,
    body: parsed.body,
    frontmatter: parsed.frontmatter,
  };
}

export function readSkillLinkedFileContent({
  linkedFileId,
  skillId,
}: {
  linkedFileId: string;
  skillId: string;
}): SkillLinkedFileContent | null {
  const summary = readSkillSummary(skillId);

  if (!summary) {
    return null;
  }

  const selectedLinkedFile =
    summary.linkedFiles.find((linkedFile) => linkedFile.id === linkedFileId) ??
    null;

  if (!selectedLinkedFile) {
    return null;
  }

  return {
    file: selectedLinkedFile,
    content: nodeSkillsFileSystem.readTextFile(selectedLinkedFile.absolutePath),
  };
}
