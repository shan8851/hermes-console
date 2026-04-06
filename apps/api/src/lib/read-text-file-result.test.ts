import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readTextFileResult } from "@/lib/read-text-file-result";

describe("readTextFileResult", () => {
  it("returns missing when the target file does not exist", () => {
    const rootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-missing-"),
    );
    const missingPath = path.join(rootPath, "missing.txt");

    expect(readTextFileResult(missingPath)).toEqual({
      status: "missing",
      content: null,
    });
  });

  it("returns unreadable when the target path exists but cannot be read as a file", () => {
    const directoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-unreadable-"),
    );

    const result = readTextFileResult(directoryPath);

    expect(result.status).toBe("unreadable");
    expect(result.content).toBeNull();
  });
});
