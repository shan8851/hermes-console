import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readRuntimeOverviewQuery } from "@/features/runtime-overview/query-runtime-overview";

describe("readRuntimeOverviewQuery", () => {
  const originalHermesRoot = process.env.HERMES_CONSOLE_HERMES_DIR;

  afterEach(() => {
    if (originalHermesRoot == null) {
      delete process.env.HERMES_CONSOLE_HERMES_DIR;
      return;
    }

    process.env.HERMES_CONSOLE_HERMES_DIR = originalHermesRoot;
  });

  it("surfaces unreadable runtime files as unreadable_path instead of missing_path", () => {
    const hermesRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-runtime-"),
    );

    fs.mkdirSync(path.join(hermesRoot, "config.yaml"));
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readRuntimeOverviewQuery();
    const unreadableConfigIssue = result.issues.find(
      (issue) => issue.id === "runtime-config-unreadable",
    );
    const missingConfigIssue = result.issues.find(
      (issue) => issue.id === "runtime-config-missing",
    );

    expect(unreadableConfigIssue?.code).toBe("unreadable_path");
    expect(missingConfigIssue).toBeUndefined();
  });

  it("surfaces a missing channel directory as an info issue", () => {
    const hermesRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-runtime-"),
    );

    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;

    const result = readRuntimeOverviewQuery();
    const missingChannelDirectoryIssue = result.issues.find(
      (issue) => issue.id === "runtime-channel-directory-missing",
    );

    expect(missingChannelDirectoryIssue).toMatchObject({
      code: "missing_path",
      severity: "info",
      summary: "channel_directory.json not found",
      path: path.join(hermesRoot, "channel_directory.json"),
    });
  });
});
