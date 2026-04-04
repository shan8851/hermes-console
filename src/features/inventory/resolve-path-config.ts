import path from "node:path";

import {
  HERMES_ROOT_ENV_KEY,
  WORKSPACE_ROOT_ENV_KEY,
  type InventoryPathConfig,
  type InventoryPathResolution,
  type InventoryResolvedPath,
} from "@/features/inventory/types";

function normalizeConfiguredPath(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return path.resolve(trimmedValue);
}

function resolveConfiguredPath({
  label,
  envKey,
  fallbackPath,
  env,
}: {
  label: InventoryResolvedPath["label"];
  envKey: InventoryResolvedPath["envKey"];
  fallbackPath: string;
  env: InventoryPathConfig["env"];
}): InventoryResolvedPath {
  const configuredPath = env[envKey];
  const normalizedPath = configuredPath ? normalizeConfiguredPath(configuredPath) : null;

  if (normalizedPath) {
    return {
      label,
      path: normalizedPath,
      kind: "env_override",
      envKey,
    };
  }

  return {
    label,
    path: fallbackPath,
    kind: "default",
    envKey,
  };
}

export function resolveInventoryPathConfig(
  config: InventoryPathConfig,
): InventoryPathResolution {
  const homeDir = path.resolve(config.homeDir);

  return {
    hermesRoot: resolveConfiguredPath({
      label: "hermes_root",
      envKey: HERMES_ROOT_ENV_KEY,
      fallbackPath: path.join(homeDir, ".hermes"),
      env: config.env,
    }),
    workspaceRoot: resolveConfiguredPath({
      label: "workspace_root",
      envKey: WORKSPACE_ROOT_ENV_KEY,
      fallbackPath: homeDir,
      env: config.env,
    }),
  };
}

function resolveDefaultHomeDir() {
  return process.env.HOME ?? /* turbopackIgnore: true */ process.cwd();
}

export function resolveInventoryPathConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  homeDir = resolveDefaultHomeDir(),
) {
  return resolveInventoryPathConfig({
    homeDir,
    env: {
      [HERMES_ROOT_ENV_KEY]: env[HERMES_ROOT_ENV_KEY],
      [WORKSPACE_ROOT_ENV_KEY]: env[WORKSPACE_ROOT_ENV_KEY],
    },
  });
}
