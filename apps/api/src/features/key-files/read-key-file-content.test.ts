import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readKeyFileContent } from "@/features/key-files/read-key-file-content";
import { readKeyFiles } from "@/features/key-files/read-key-files";

const previousHermesRoot = process.env.HERMES_CONSOLE_HERMES_DIR;
const previousWorkspaceRoot = process.env.HERMES_CONSOLE_WORKSPACE_DIR;

const createHermesRoot = () => {
  const hermesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-files-"));
  fs.mkdirSync(path.join(hermesRoot, "memories"), { recursive: true });
  fs.writeFileSync(path.join(hermesRoot, "SOUL.md"), "# Soul");
  fs.writeFileSync(path.join(hermesRoot, "AGENTS.md"), "# Agents");
  return hermesRoot;
};

describe("readKeyFileContent", () => {
  afterEach(() => {
    if (previousHermesRoot == null) {
      delete process.env.HERMES_CONSOLE_HERMES_DIR;
    } else {
      process.env.HERMES_CONSOLE_HERMES_DIR = previousHermesRoot;
    }

    if (previousWorkspaceRoot == null) {
      delete process.env.HERMES_CONSOLE_WORKSPACE_DIR;
    } else {
      process.env.HERMES_CONSOLE_WORKSPACE_DIR = previousWorkspaceRoot;
    }
  });

  it("returns null for an invalid file selection instead of falling back", () => {
    const hermesRoot = createHermesRoot();
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;
    delete process.env.HERMES_CONSOLE_WORKSPACE_DIR;

    expect(readKeyFileContent("missing:file")).toBeNull();
  });

  it("returns the exact selected file when the id exists", () => {
    const hermesRoot = createHermesRoot();
    process.env.HERMES_CONSOLE_HERMES_DIR = hermesRoot;
    delete process.env.HERMES_CONSOLE_WORKSPACE_DIR;

    const selectedFile = readKeyFiles().files.find((file) => file.name === "AGENTS.md");

    expect(selectedFile).not.toBeNull();
    expect(readKeyFileContent(selectedFile!.id)?.file.name).toBe("AGENTS.md");
  });
});
