import path from "node:path";

import type { KeyFilesDiscoveryResult, KeyFileKind, KeyFileScope, KeyFileSummary } from "@/features/key-files/types";

export type KeyFileStat = {
  size: number;
  mtimeMs: number;
};

export type KeyFilesFileSystem = {
  pathExists(targetPath: string): boolean;
  listDirectories(targetPath: string): string[];
  listFiles(targetPath: string): string[];
  statFile(targetPath: string): KeyFileStat | null;
  readTextFile(targetPath: string): string | null;
};

type FileCandidate = {
  relativePath: string;
  name: string;
  kind: KeyFileKind;
};

const HERMES_ROOT_CANDIDATES: FileCandidate[] = [
  { relativePath: "SOUL.md", name: "SOUL.md", kind: "identity" },
  { relativePath: "AGENTS.md", name: "AGENTS.md", kind: "instruction" },
  { relativePath: "CLAUDE.md", name: "CLAUDE.md", kind: "instruction" },
  { relativePath: ".hermes.md", name: ".hermes.md", kind: "instruction" },
  { relativePath: ".cursorrules", name: ".cursorrules", kind: "instruction" },
  { relativePath: "memories/MEMORY.md", name: "MEMORY.md", kind: "memory" },
  { relativePath: "memories/USER.md", name: "USER.md", kind: "memory" },
];

const WORKSPACE_EXACT_FILE_NAMES = new Set([".cursorrules"]);
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  "vendor",
  "tmp",
  ".turbo",
  ".pnpm-store",
  "go",
]);

function createSummary({
  scope,
  rootPath,
  filePath,
  name,
  kind,
  stat,
}: {
  scope: KeyFileScope;
  rootPath: string;
  filePath: string;
  name: string;
  kind: KeyFileKind;
  stat: KeyFileStat;
}): KeyFileSummary {
  const relativePath = path.relative(rootPath, filePath) || name;

  return {
    id: `${scope}:${relativePath}`,
    path: filePath,
    name,
    scope,
    relativePath,
    kind,
    fileSize: stat.size,
    lastModifiedMs: stat.mtimeMs,
  };
}

function discoverHermesRootFiles({
  hermesRoot,
  fileSystem,
}: {
  hermesRoot: string;
  fileSystem: KeyFilesFileSystem;
}): KeyFileSummary[] {
  if (!fileSystem.pathExists(hermesRoot)) {
    return [];
  }

  return HERMES_ROOT_CANDIDATES.flatMap((candidate) => {
    const filePath = path.join(hermesRoot, candidate.relativePath);
    const stat = fileSystem.statFile(filePath);

    if (!stat) {
      return [];
    }

    return [
      createSummary({
        scope: "hermes_root",
        rootPath: hermesRoot,
        filePath,
        name: candidate.name,
        kind: candidate.kind,
        stat,
      }),
    ];
  });
}

function collectWorkspaceDirectories({
  workspaceRoot,
  fileSystem,
}: {
  workspaceRoot: string;
  fileSystem: KeyFilesFileSystem;
}) {
  if (!fileSystem.pathExists(workspaceRoot)) {
    return [] as string[];
  }

  const directories = [workspaceRoot];
  const levelOne = fileSystem
    .listDirectories(workspaceRoot)
    .filter((name) => !IGNORED_DIRECTORY_NAMES.has(name))
    .map((name) => path.join(workspaceRoot, name));

  directories.push(...levelOne);

  for (const levelOnePath of levelOne) {
    const nested = fileSystem
      .listDirectories(levelOnePath)
      .filter((name) => !IGNORED_DIRECTORY_NAMES.has(name))
      .map((name) => path.join(levelOnePath, name));

    directories.push(...nested);
  }

  return directories;
}

function classifyWorkspaceFile(fileName: string): KeyFileKind | null {
  if (fileName === "SOUL.md") {
    return "identity";
  }

  if (fileName.endsWith(".md") || WORKSPACE_EXACT_FILE_NAMES.has(fileName)) {
    return "instruction";
  }

  return null;
}

function discoverWorkspaceFiles({
  workspaceRoot,
  fileSystem,
}: {
  workspaceRoot: string;
  fileSystem: KeyFilesFileSystem;
}): KeyFileSummary[] {
  const directories = collectWorkspaceDirectories({ workspaceRoot, fileSystem });
  const files: KeyFileSummary[] = [];

  for (const directoryPath of directories) {
    for (const fileName of fileSystem.listFiles(directoryPath)) {
      const kind = classifyWorkspaceFile(fileName);

      if (!kind) {
        continue;
      }

      const filePath = path.join(directoryPath, fileName);
      const stat = fileSystem.statFile(filePath);

      if (!stat) {
        continue;
      }

      files.push(
        createSummary({
          scope: "workspace_root",
          rootPath: workspaceRoot,
          filePath,
          name: fileName,
          kind,
          stat,
        }),
      );
    }
  }

  return files;
}

export function discoverKeyFiles({
  hermesRoot,
  workspaceRoot,
  fileSystem,
}: {
  hermesRoot: string;
  workspaceRoot: string;
  fileSystem: KeyFilesFileSystem;
}): KeyFilesDiscoveryResult {
  const discovered = [
    ...discoverHermesRootFiles({ hermesRoot, fileSystem }),
    ...discoverWorkspaceFiles({ workspaceRoot, fileSystem }),
  ];

  const deduped = Array.from(new Map(discovered.map((file) => [file.path, file])).values()).sort(
    (left, right) => left.path.localeCompare(right.path),
  );

  return {
    roots: {
      hermesRoot,
      workspaceRoot,
    },
    files: deduped,
  };
}
