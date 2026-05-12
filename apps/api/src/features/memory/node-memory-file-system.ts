import fs from 'node:fs';

import type { MemoryFileSystem } from '@/features/memory/read-memory-files';

export const nodeMemoryFileSystem: MemoryFileSystem = {
  pathExists(targetPath) {
    try {
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  },
  getLastModifiedMs(targetPath) {
    try {
      if (!fs.existsSync(targetPath)) {
        return null;
      }

      return fs.statSync(targetPath).mtimeMs;
    } catch {
      return null;
    }
  },
  readTextFile(targetPath) {
    try {
      if (!fs.existsSync(targetPath)) {
        return null;
      }

      return fs.readFileSync(targetPath, 'utf8');
    } catch {
      return null;
    }
  }
};
