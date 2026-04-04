import path from "node:path";

import { describe, expect, it } from "vitest";

import { discoverKeyFiles, type KeyFilesFileSystem } from "@/features/key-files/discover-key-files";

function createFileSystem({
  files,
  directories = {},
}: {
  files: Record<string, { size?: number; mtimeMs?: number }>;
  directories?: Record<string, string[]>;
}): KeyFilesFileSystem {
  return {
    pathExists(targetPath) {
      return targetPath in directories || targetPath in files;
    },
    listDirectories(targetPath) {
      return directories[targetPath] ?? [];
    },
    listFiles(targetPath) {
      return Object.keys(files)
        .filter((filePath) => path.dirname(filePath) === targetPath)
        .map((filePath) => path.basename(filePath))
        .sort((left, right) => left.localeCompare(right));
    },
    statFile(targetPath) {
      if (!(targetPath in files)) {
        return null;
      }

      return {
        size: files[targetPath].size ?? 100,
        mtimeMs: files[targetPath].mtimeMs ?? 123,
      };
    },
    readTextFile(targetPath) {
      return targetPath in files ? "example" : null;
    },
  };
}

describe("discoverKeyFiles", () => {
  it("discovers explicit Hermes-root files and bounded workspace markdown files", () => {
    const result = discoverKeyFiles({
      hermesRoot: "/home/shan/.hermes",
      workspaceRoot: "/home/shan/.hermes-workspaces",
      fileSystem: createFileSystem({
        files: {
          "/home/shan/.hermes/SOUL.md": {},
          "/home/shan/.hermes/memories/MEMORY.md": {},
          "/home/shan/.hermes/memories/USER.md": {},
          "/home/shan/.hermes-workspaces/main/AGENTS.md": {},
          "/home/shan/.hermes-workspaces/main/TOOLS.md": {},
          "/home/shan/.hermes-workspaces/nigel/CURRENT.md": {},
          "/home/shan/.hermes-workspaces/nigel/notes.txt": {},
        },
        directories: {
          "/home/shan/.hermes": ["memories"],
          "/home/shan/.hermes/memories": [],
          "/home/shan/.hermes-workspaces": ["main", "nigel"],
          "/home/shan/.hermes-workspaces/main": [],
          "/home/shan/.hermes-workspaces/nigel": [],
        },
      }),
    });

    expect(result.files.map((file) => file.path)).toEqual([
      "/home/shan/.hermes-workspaces/main/AGENTS.md",
      "/home/shan/.hermes-workspaces/main/TOOLS.md",
      "/home/shan/.hermes-workspaces/nigel/CURRENT.md",
      "/home/shan/.hermes/memories/MEMORY.md",
      "/home/shan/.hermes/memories/USER.md",
      "/home/shan/.hermes/SOUL.md",
    ]);
    expect(result.files.find((file) => file.path.endsWith("TOOLS.md"))).toMatchObject({
      scope: "workspace_root",
      relativePath: "main/TOOLS.md",
      kind: "instruction",
    });
  });

  it("dedupes repeated discoveries and ignores missing roots", () => {
    const result = discoverKeyFiles({
      hermesRoot: "/missing/.hermes",
      workspaceRoot: "/home/shan/.hermes-workspaces",
      fileSystem: createFileSystem({
        files: {
          "/home/shan/.hermes-workspaces/AGENTS.md": {},
        },
        directories: {
          "/home/shan/.hermes-workspaces": ["main"],
          "/home/shan/.hermes-workspaces/main": [],
        },
      }),
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({
      path: "/home/shan/.hermes-workspaces/AGENTS.md",
      scope: "workspace_root",
    });
  });

  it("keeps workspace discovery bounded to two directory levels", () => {
    const result = discoverKeyFiles({
      hermesRoot: "/home/shan/.hermes",
      workspaceRoot: "/home/shan/.hermes-workspaces",
      fileSystem: createFileSystem({
        files: {
          "/home/shan/.hermes-workspaces/main/nested/deeper/AGENTS.md": {},
          "/home/shan/.hermes-workspaces/main/nested/AGENTS.md": {},
        },
        directories: {
          "/home/shan/.hermes-workspaces": ["main"],
          "/home/shan/.hermes-workspaces/main": ["nested"],
          "/home/shan/.hermes-workspaces/main/nested": ["deeper"],
        },
      }),
    });

    expect(result.files.map((file) => file.path)).toEqual([
      "/home/shan/.hermes-workspaces/main/nested/AGENTS.md",
    ]);
  });
});
