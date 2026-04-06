import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readCronJobsFileResult } from "@/features/cron/node-cron-sources";

describe("readCronJobsFileResult", () => {
  it("surfaces a parse issue when jobs.json does not contain a jobs array", () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-cron-"));
    const cronRoot = path.join(agentRoot, "cron");

    fs.mkdirSync(cronRoot, { recursive: true });
    fs.writeFileSync(path.join(cronRoot, "jobs.json"), JSON.stringify({ invalid: true }));

    const result = readCronJobsFileResult(agentRoot);

    expect(result.data.jobs).toEqual([]);
    expect(result.issues[0]?.code).toBe("parse_failed");
  });

  it("surfaces a parse issue when a cron job entry is missing required fields", () => {
    const agentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-cron-"));
    const cronRoot = path.join(agentRoot, "cron");

    fs.mkdirSync(cronRoot, { recursive: true });
    fs.writeFileSync(
      path.join(cronRoot, "jobs.json"),
      JSON.stringify({
        jobs: [{ name: "missing-id" }],
      }),
    );

    const result = readCronJobsFileResult(agentRoot);

    expect(result.data.jobs).toEqual([]);
    expect(result.issues[0]?.code).toBe("parse_failed");
  });
});
