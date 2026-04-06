import os from "node:os";
import path from "node:path";

import {
  HERMES_ROOT_ENV_KEY,
  WORKSPACE_ROOT_ENV_KEY,
  type InventoryPathConfig,
  type InventoryPathResolution,
  type InventoryResolvedPath,
} from "@hermes-console/runtime";

function expandHomeDirectoryPrefix({
  homeDir,
  value,
}: {
  homeDir: string;
  value: string;
}) {
  if (value === "~") {
    return homeDir;
  }

  if (value.startsWith("~/")) {
    return path.join(homeDir, value.slice(2));
  }

  return value;
}

export function normalizeConfiguredPath({
  homeDir,
  value,
}: {
  homeDir: string;
  value: string;
}) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return path.resolve(
    expandHomeDirectoryPrefix({
      homeDir,
      value: trimmedValue,
    }),
  );
}

function resolveConfiguredPath({
  label,
  envKey,
  fallbackPath,
  homeDir,
  env,
}: {
  label: InventoryResolvedPath["label"];
  envKey: InventoryResolvedPath["envKey"];
  fallbackPath: string;
  homeDir: string;
  env: InventoryPathConfig["env"];
}): InventoryResolvedPath {
  const configuredPath = env[envKey];
  const normalizedPath = configuredPath
    ? normalizeConfiguredPath({
        homeDir,
        value: configuredPath,
      })
    : null;

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
      homeDir,
      env: config.env,
    }),
    workspaceRoot: resolveConfiguredPath({
      label: "workspace_root",
      envKey: WORKSPACE_ROOT_ENV_KEY,
      fallbackPath: homeDir,
      homeDir,
      env: config.env,
    }),
  };
}

function resolveDefaultHomeDir() {
  return process.env.HOME ?? os.homedir();
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

export function isWorkspaceRootConfigured(
  paths: InventoryPathResolution,
) {
  return paths.workspaceRoot.kind === "env_override";
}
