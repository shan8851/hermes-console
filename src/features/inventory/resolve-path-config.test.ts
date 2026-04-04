import { describe, expect, it } from "vitest";

import {
  HERMES_ROOT_ENV_KEY,
  WORKSPACE_ROOT_ENV_KEY,
} from "@/features/inventory/types";
import {
  resolveInventoryPathConfig,
  resolveInventoryPathConfigFromEnv,
} from "@/features/inventory/resolve-path-config";

describe("resolveInventoryPathConfig", () => {
  it("uses the default Hermes and workspace roots when env overrides are missing", () => {
    expect(
      resolveInventoryPathConfig({
        homeDir: "/home/shan",
        env: {},
      }),
    ).toEqual({
      hermesRoot: {
        label: "hermes_root",
        path: "/home/shan/.hermes",
        kind: "default",
        envKey: HERMES_ROOT_ENV_KEY,
      },
      workspaceRoot: {
        label: "workspace_root",
        path: "/home/shan",
        kind: "default",
        envKey: WORKSPACE_ROOT_ENV_KEY,
      },
    });
  });

  it("uses env overrides when they contain non-empty values", () => {
    expect(
      resolveInventoryPathConfig({
        homeDir: "/home/shan",
        env: {
          [HERMES_ROOT_ENV_KEY]: "/srv/hermes ",
          [WORKSPACE_ROOT_ENV_KEY]: "/tmp/workspace ",
        },
      }),
    ).toEqual({
      hermesRoot: {
        label: "hermes_root",
        path: "/srv/hermes",
        kind: "env_override",
        envKey: HERMES_ROOT_ENV_KEY,
      },
      workspaceRoot: {
        label: "workspace_root",
        path: "/tmp/workspace",
        kind: "env_override",
        envKey: WORKSPACE_ROOT_ENV_KEY,
      },
    });
  });

  it("falls back to defaults when env overrides are blank", () => {
    expect(
      resolveInventoryPathConfig({
        homeDir: "/Users/shan",
        env: {
          [HERMES_ROOT_ENV_KEY]: "   ",
          [WORKSPACE_ROOT_ENV_KEY]: "",
        },
      }),
    ).toEqual({
      hermesRoot: {
        label: "hermes_root",
        path: "/Users/shan/.hermes",
        kind: "default",
        envKey: HERMES_ROOT_ENV_KEY,
      },
      workspaceRoot: {
        label: "workspace_root",
        path: "/Users/shan",
        kind: "default",
        envKey: WORKSPACE_ROOT_ENV_KEY,
      },
    });
  });
});

describe("resolveInventoryPathConfigFromEnv", () => {
  it("reads environment variables from a provided env object", () => {
    expect(
      resolveInventoryPathConfigFromEnv(
        {
          [HERMES_ROOT_ENV_KEY]: "/custom/hermes",
          [WORKSPACE_ROOT_ENV_KEY]: "/custom/workspace",
        },
        "/home/ignored",
      ),
    ).toEqual({
      hermesRoot: {
        label: "hermes_root",
        path: "/custom/hermes",
        kind: "env_override",
        envKey: HERMES_ROOT_ENV_KEY,
      },
      workspaceRoot: {
        label: "workspace_root",
        path: "/custom/workspace",
        kind: "env_override",
        envKey: WORKSPACE_ROOT_ENV_KEY,
      },
    });
  });
});
