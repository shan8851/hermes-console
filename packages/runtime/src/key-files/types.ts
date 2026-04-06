import { z } from "zod";

import { memoryReadResultSchema } from "../memory/types.js";

export type KeyFileScope = "hermes_root" | "workspace_root";
export type KeyFileKind = "memory" | "identity" | "instruction";

export type KeyFileSummary = {
  id: string;
  path: string;
  name: string;
  scope: KeyFileScope;
  relativePath: string;
  kind: KeyFileKind;
  fileSize: number;
  lastModifiedMs: number;
};

export type KeyFilesDiscoveryResult = {
  roots: {
    hermesRoot: string;
    workspaceRoot: string;
  };
  files: KeyFileSummary[];
};

export type KeyFilesData = {
  keyFiles: KeyFilesDiscoveryResult;
  memory: import("../memory/types.js").MemoryReadResult;
};

export type KeyFileContentData = {
  file: KeyFileSummary;
  content: string | null;
};

export const keyFileScopeSchema = z.enum(["hermes_root", "workspace_root"]);
export const keyFileKindSchema = z.enum(["memory", "identity", "instruction"]);

export const keyFileSummarySchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  scope: keyFileScopeSchema,
  relativePath: z.string(),
  kind: keyFileKindSchema,
  fileSize: z.number(),
  lastModifiedMs: z.number(),
});

export const keyFilesDiscoveryResultSchema = z.object({
  roots: z.object({
    hermesRoot: z.string(),
    workspaceRoot: z.string(),
  }),
  files: z.array(keyFileSummarySchema),
});

export const keyFilesDataSchema = z.object({
  keyFiles: keyFilesDiscoveryResultSchema,
  memory: memoryReadResultSchema,
});

export const keyFileContentDataSchema = z.object({
  file: keyFileSummarySchema,
  content: z.string().nullable(),
});
