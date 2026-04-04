export const HERMES_ROOT_ENV_KEY = "HERMES_CONSOLE_HERMES_DIR";
export const WORKSPACE_ROOT_ENV_KEY = "HERMES_CONSOLE_WORKSPACE_DIR";

export type InventoryEnvKey =
  | typeof HERMES_ROOT_ENV_KEY
  | typeof WORKSPACE_ROOT_ENV_KEY;

export type InventoryPathKind = "default" | "env_override";

export type InventoryResolvedPath = {
  label: "hermes_root" | "workspace_root";
  path: string;
  kind: InventoryPathKind;
  envKey: InventoryEnvKey;
};

export type InventoryPathConfig = {
  homeDir: string;
  env: Partial<Record<InventoryEnvKey, string | undefined>>;
};

export type InventoryPathResolution = {
  hermesRoot: InventoryResolvedPath;
  workspaceRoot: InventoryResolvedPath;
};
