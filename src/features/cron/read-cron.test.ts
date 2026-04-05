import { describe, expect, it } from "vitest";

import {
  buildCronJobDetail,
  normalizeCronJobs,
  type CronJobRecord,
  type CronRunOutputRecord,
} from "@/features/cron/read-cron";

function createJob(overrides: Partial<CronJobRecord> = {}): CronJobRecord {
  return {
    id: "0e9490927b08",
    name: "Cron alert observer -> Discord alerts",
    agentId: "default",
    agentLabel: "Default",
    agentRootPath: "/home/shan/.hermes",
    enabled: true,
    state: "scheduled",
    scheduleDisplay: "*/15 * * * *",
    createdAt: "2026-04-02T13:55:53.064Z",
    nextRunAt: "2026-04-04T15:15:00.000Z",
    lastRunAt: "2026-04-04T15:00:23.058Z",
    lastStatus: "ok",
    lastError: null,
    deliver: "discord:1489250470147919902",
    prompt: "Run playbook `cron-alert-observer.md` exactly.",
    skills: [],
    skill: null,
    scheduleKind: "cron",
    repeatCompleted: 203,
    originChatName: null,
    ...overrides,
  };
}

function createOutput(overrides: Partial<CronRunOutputRecord> = {}): CronRunOutputRecord {
  return {
    id: "0e9490927b08:2026-04-04_15-31-06.md",
    jobId: "0e9490927b08",
    fileName: "2026-04-04_15-31-06.md",
    path: "/home/shan/.hermes/cron/output/0e9490927b08/2026-04-04_15-31-06.md",
    createdAt: "2026-04-04T15:31:06.000Z",
    responsePreview: "[SILENT]",
    responseState: "silent",
    rawContent: "# Cron Job\n\n## Response\n\n[SILENT]\n",
    ...overrides,
  };
}

describe("normalizeCronJobs", () => {
  it("parses jobs and joins recent outputs", () => {
    const jobs = normalizeCronJobs({
      agent: {
        id: "default",
        label: "Default",
        rootPath: "/home/shan/.hermes",
        source: "root",
      },
      rawJobs: {
        jobs: [
          {
            id: "0e9490927b08",
            name: "Cron alert observer -> Discord alerts",
            prompt: "Run playbook `cron-alert-observer.md` exactly.",
            skills: [],
            skill: null,
            schedule: { kind: "cron", expr: "*/15 * * * *", display: "*/15 * * * *" },
            schedule_display: "*/15 * * * *",
            repeat: { times: null, completed: 203 },
            enabled: true,
            state: "scheduled",
            created_at: "2026-04-02T14:55:53.064175+01:00",
            next_run_at: "2026-04-04T16:15:00+01:00",
            last_run_at: "2026-04-04T16:00:23.058385+01:00",
            last_status: "ok",
            last_error: null,
            deliver: "discord:1489250470147919902",
            origin: null,
          },
        ],
      },
      outputsByJobId: new Map([["0e9490927b08", [createOutput()]]]),
    });

    expect(jobs).toEqual([
      expect.objectContaining({
        summaryId: "default:0e9490927b08",
        id: "0e9490927b08",
        jobId: "0e9490927b08",
        name: "Cron alert observer -> Discord alerts",
        statusTone: "healthy",
        latestOutputState: "silent",
        recentOutputCount: 1,
      }),
    ]);
  });

  it("flags failing and disabled jobs honestly", () => {
    const jobs = normalizeCronJobs({
      agent: {
        id: "nigel",
        label: "nigel",
        rootPath: "/home/shan/.hermes/profiles/nigel",
        source: "profile",
      },
      rawJobs: {
        jobs: [
          {
            id: "badjob",
            name: "Broken cron",
            prompt: "do the thing",
            skills: [],
            skill: null,
            schedule: { kind: "cron", expr: "0 * * * *", display: "0 * * * *" },
            schedule_display: "0 * * * *",
            repeat: { times: null, completed: 2 },
            enabled: false,
            state: "paused",
            created_at: "2026-04-02T14:55:53.064175+01:00",
            next_run_at: null,
            last_run_at: "2026-04-04T10:00:00+01:00",
            last_status: "error",
            last_error: "boom",
            deliver: "local",
            origin: { chat_name: "COOPER_LAND / #general / Cron migration" },
          },
        ],
      },
      outputsByJobId: new Map(),
    });

    expect(jobs[0]).toMatchObject({
      enabled: false,
      statusTone: "error",
      lastStatus: "error",
      lastError: "boom",
      originChatName: "COOPER_LAND / #general / Cron migration",
    });
  });
});

describe("buildCronJobDetail", () => {
  it("builds a useful detail model with recent outputs", () => {
    const detail = buildCronJobDetail({
      job: createJob(),
      outputs: [
        createOutput({ responsePreview: "[SILENT]", responseState: "silent" }),
        createOutput({
          id: "0e9490927b08:2026-04-04_07-03-09.md",
          fileName: "2026-04-04_07-03-09.md",
          createdAt: "2026-04-04T07:03:09.000Z",
          responsePreview: "Today's priority: pick one OSS bet.",
          responseState: "contentful",
        }),
      ],
    });

    expect(detail).toMatchObject({
      recentOutputCount: 2,
      hasOutputs: true,
      latestOutputState: "silent",
    });
    expect(detail.outputs[1]).toMatchObject({
      responseState: "contentful",
      responsePreview: "Today's priority: pick one OSS bet.",
    });
  });
});
