import { z } from "zod";

import type { InventoryPathResolution } from "./types.js";
import { inventoryPathResolutionSchema } from "./types.js";

export type InventoryPresenceKey =
  | "config"
  | "memory"
  | "sessions"
  | "cron"
  | "skills"
  | "stateDb";

export type InventoryPresenceMap = Record<InventoryPresenceKey, boolean>;

export type HermesAgentIdentity = {
  id: string;
  label: string;
  rootPath: string;
  source: "root" | "profile";
  presence: InventoryPresenceMap;
  isAvailable: boolean;
};

export type InventoryInstallationStatus = "ready" | "partial" | "missing";

export type InventoryInstallation = {
  paths: InventoryPathResolution;
  hermesRootExists: boolean;
  profilesRootPath: string;
  profilesRootExists: boolean;
  agents: HermesAgentIdentity[];
  availableAgentCount: number;
  status: InventoryInstallationStatus;
};

export const inventoryPresenceKeySchema = z.enum([
  "config",
  "memory",
  "sessions",
  "cron",
  "skills",
  "stateDb",
]);

export const inventoryPresenceMapSchema = z.object({
  config: z.boolean(),
  memory: z.boolean(),
  sessions: z.boolean(),
  cron: z.boolean(),
  skills: z.boolean(),
  stateDb: z.boolean(),
});

export const hermesAgentIdentitySchema = z.object({
  id: z.string(),
  label: z.string(),
  rootPath: z.string(),
  source: z.enum(["root", "profile"]),
  presence: inventoryPresenceMapSchema,
  isAvailable: z.boolean(),
});

export const inventoryInstallationStatusSchema = z.enum([
  "ready",
  "partial",
  "missing",
]);

export const inventoryInstallationSchema = z.object({
  paths: inventoryPathResolutionSchema,
  hermesRootExists: z.boolean(),
  profilesRootPath: z.string(),
  profilesRootExists: z.boolean(),
  agents: z.array(hermesAgentIdentitySchema),
  availableAgentCount: z.number(),
  status: inventoryInstallationStatusSchema,
});
