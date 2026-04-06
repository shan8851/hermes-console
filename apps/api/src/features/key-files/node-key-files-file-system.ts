import fs from "node:fs";

import type { KeyFilesFileSystem } from "@/features/key-files/discover-key-files";

export const nodeKeyFilesFileSystem: KeyFilesFileSystem = {
  pathExists(targetPath) {
    try {
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  },
  listDirectories(targetPath) {
    try {
      if (!fs.existsSync(targetPath)) {
        return [];
      }

      return fs
        .readdirSync(targetPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  },
  listFiles(targetPath) {
    try {
      if (!fs.existsSync(targetPath)) {
        return [];
      }

      return fs
        .readdirSync(targetPath, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    } catch {
      return [];
    }
  },
  statFile(targetPath) {
    try {
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
    } catch {
      return null;
    }
  },
  readTextFile(targetPath) {
    try {
      if (!fs.existsSync(targetPath)) {
        return null;
      }

      const stat = fs.statSync(targetPath);

      if (!stat.isFile()) {
        return null;
      }

      return fs.readFileSync(targetPath, "utf8");
    } catch {
      return null;
    }
  },
};
