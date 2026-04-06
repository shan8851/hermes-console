import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeConfiguredPath,
  resolveInventoryPathConfig,
} from "@/features/inventory/resolve-path-config";

describe("resolveInventoryPathConfig", () => {
  it("expands a tilde-prefixed configured path against the provided home directory", () => {
    expect(
      normalizeConfiguredPath({
        homeDir: "/home/tester",
        value: "~/.hermes",
      }),
    ).toBe(path.resolve("/home/tester/.hermes"));
  });

  it("uses expanded env overrides for both hermes and workspace roots", () => {
    const paths = resolveInventoryPathConfig({
      homeDir: "/home/tester",
      env: {
        HERMES_CONSOLE_HERMES_DIR: "~/.hermes-custom",
        HERMES_CONSOLE_WORKSPACE_DIR: "~/workspace/project",
      },
    });

    expect(paths.hermesRoot.path).toBe(path.resolve("/home/tester/.hermes-custom"));
    expect(paths.workspaceRoot.path).toBe(
      path.resolve("/home/tester/workspace/project"),
    );
  });
});
