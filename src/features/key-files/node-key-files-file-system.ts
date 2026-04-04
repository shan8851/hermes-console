import fs from "node:fs";

import type { KeyFilesFileSystem } from "@/features/key-files/discover-key-files";

export const nodeKeyFilesFileSystem: KeyFilesFileSystem = {
  pathExists(targetPath) {
    return fs.existsSync(targetPath);
  },
  listDirectories(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return [];
    }

    return fs
      .readdirSync(targetPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  },
  listFiles(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return [];
    }

    return fs
      .readdirSync(targetPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  },
  statFile(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return null;
    }

    const stat = fs.statSync(targetPath);

    if (!stat.isFile()) {
      return null;
    }

    return {
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  },
  readTextFile(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return null;
    }

    const stat = fs.statSync(targetPath);

    if (!stat.isFile()) {
      return null;
    }

    return fs.readFileSync(targetPath, "utf8");
  },
};
