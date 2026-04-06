import path from "node:path";

import { compareSkillCategories } from "@hermes-console/runtime";
import type {
  SkillLinkedFileKind,
  SkillLinkedFileSummary,
  SkillParseStatus,
  SkillSummary,
  SkillsIndexResult,
} from "@hermes-console/runtime";

export type SkillsFileSystem = {
  pathExists(targetPath: string): boolean;
  listDirectories(targetPath: string): string[];
  listFiles(targetPath: string): string[];
  readTextFile(targetPath: string): string | null;
};

const LINKED_DIRECTORY_KINDS: Record<string, SkillLinkedFileKind> = {
  references: "reference",
  templates: "template",
  scripts: "script",
  assets: "asset",
};

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
      body: normalized.trim(),
      frontmatter: {} as Record<string, string>,
      parseStatus: "malformed" as SkillParseStatus,
    };
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);

  if (closingIndex === -1) {
    return {
      body: normalized.trim(),
      frontmatter: {} as Record<string, string>,
      parseStatus: "malformed" as SkillParseStatus,
    };
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const body = normalized.slice(closingIndex + 5).trim();
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterBlock.split("\n")) {
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
    body,
    frontmatter,
    parseStatus:
      typeof frontmatter.name === "string" && typeof frontmatter.description === "string"
        ? ("valid" as SkillParseStatus)
        : ("malformed" as SkillParseStatus),
  };
}

function collectLinkedFiles({
  skillRoot,
  relativeDirectory,
  kind,
  fileSystem,
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
    absolutePath: path.join(absoluteDirectory, fileName),
  }));

  const nested = fileSystem.listDirectories(absoluteDirectory).flatMap((nestedDirectory) =>
    collectLinkedFiles({
      skillRoot,
      relativeDirectory: `${relativeDirectory}/${nestedDirectory}`,
      kind,
      fileSystem,
    }),
  );

  return [...files, ...nested].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function collectSkillDirectories({
  currentPath,
  relativePath,
  fileSystem,
}: {
  currentPath: string;
  relativePath: string;
  fileSystem: SkillsFileSystem;
}): Array<{ skillRoot: string; relativePath: string }> {
  const files = fileSystem.listFiles(currentPath);

  if (files.includes("SKILL.md")) {
    return [{ skillRoot: currentPath, relativePath }];
  }

  return fileSystem
    .listDirectories(currentPath)
    .filter((directoryName) => !directoryName.startsWith("."))
    .flatMap((directoryName) =>
      collectSkillDirectories({
        currentPath: path.join(currentPath, directoryName),
        relativePath: relativePath ? `${relativePath}/${directoryName}` : directoryName,
        fileSystem,
      }),
    );
}

function createSkillSummary({
  skillsRoot,
  skillRoot,
  relativePath,
  fileSystem,
}: {
  skillsRoot: string;
  skillRoot: string;
  relativePath: string;
  fileSystem: SkillsFileSystem;
}): SkillSummary {
  const skillFilePath = path.join(skillRoot, "SKILL.md");
  const rawContent = fileSystem.readTextFile(skillFilePath) ?? "";
  const parsed = parseFrontmatter(rawContent);
  const pathSegments = relativePath.split("/").filter(Boolean);
  const slug = pathSegments.at(-1) ?? path.basename(skillRoot);
  const category = pathSegments.slice(0, -1).join("/") || "uncategorized";

  const linkedFiles = Object.entries(LINKED_DIRECTORY_KINDS).flatMap(([directoryName, kind]) =>
    collectLinkedFiles({
      skillRoot,
      relativeDirectory: directoryName,
      kind,
      fileSystem,
    }),
  );

  return {
    id: relativePath,
    slug,
    name: parsed.frontmatter.name ?? slug,
    description: parsed.frontmatter.description ?? "No description found in SKILL.md.",
    category,
    skillPath: path.relative(skillsRoot, skillFilePath),
    parseStatus: parsed.parseStatus,
    linkedFiles,
  };
}

export function readSkillsIndex({
  skillsRoot,
  fileSystem,
}: {
  skillsRoot: string;
  fileSystem: SkillsFileSystem;
}): SkillsIndexResult {
  if (!fileSystem.pathExists(skillsRoot)) {
    return {
      skillsRoot,
      skills: [],
    };
  }

  const skillDirectories = collectSkillDirectories({
    currentPath: skillsRoot,
    relativePath: "",
    fileSystem,
  });

  const skills = skillDirectories
    .map(({ skillRoot, relativePath }) =>
      createSkillSummary({
        skillsRoot,
        skillRoot,
        relativePath,
        fileSystem,
      }),
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
    skills,
  };
}
