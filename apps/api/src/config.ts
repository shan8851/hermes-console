import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { z } from "zod";

const serverEnvSchema = z.object({
  PORT: z.string().optional(),
});

export type ServerConfig = {
  port: number;
  repoRoot: string;
  webDistDir: string;
};

const findRepoRoot = (startPath: string): string => {
  let currentPath = path.resolve(startPath);

  while (true) {
    if (fs.existsSync(path.join(currentPath, "pnpm-workspace.yaml"))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return path.resolve(startPath);
    }

    currentPath = parentPath;
  }
};

const loadEnvironment = (repoRoot: string): void => {
  const environmentFiles = [".env.local", ".env"];

  environmentFiles.forEach((fileName) => {
    const filePath = path.join(repoRoot, fileName);

    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false });
    }
  });
};

const parsePort = (value: string | undefined): number => {
  if (value == null) {
    return 3940;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return parsed;
};

export const readServerConfig = (): ServerConfig => {
  const repoRoot = findRepoRoot(process.cwd());
  loadEnvironment(repoRoot);

  const env = serverEnvSchema.parse(process.env);

  return {
    port: parsePort(env.PORT),
    repoRoot,
    webDistDir: path.join(repoRoot, "apps", "web", "dist"),
  };
};
