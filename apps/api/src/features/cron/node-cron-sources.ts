import fs from "node:fs";
import path from "node:path";

import { createParseFailedIssue, createUnreadablePathIssue } from "@/lib/query-issue-factories";
import { createReadResult, type ReadResult } from "@/lib/read-result";
import {
  cronJobsFileSourceSchema,
  type CronJobsFileSource,
  type CronRunOutputRecord,
} from "@hermes-console/runtime";
import type { HermesQueryIssue } from "@hermes-console/runtime";

function normalizeDateString(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseOutputTimestamp(fileName: string) {
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.md$/);

  if (!match) {
    return null;
  }

  return normalizeDateString(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`);
}

function extractResponse(rawContent: string) {
  const marker = "## Response";
  const markerIndex = rawContent.indexOf(marker);

  if (markerIndex === -1) {
    const trimmed = rawContent.trim();
    return trimmed ? trimmed.slice(0, 280) : "No response captured.";
  }

  const response = rawContent.slice(markerIndex + marker.length).trim();
  return response ? response.slice(0, 280) : "No response captured.";
}

function resolveResponseState(preview: string): CronRunOutputRecord["responseState"] {
  if (!preview || preview === "No response captured.") {
    return "missing";
  }

  if (preview.trim() === "[SILENT]") {
    return "silent";
  }

  return "contentful";
}

export function readCronJobsFileResult(
  agentRootPath: string,
): ReadResult<CronJobsFileSource> {
  const jobsPath = path.join(agentRootPath, "cron", "jobs.json");

  if (!fs.existsSync(jobsPath)) {
    return createReadResult({
      data: { jobs: [] },
    });
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(jobsPath, "utf8")) as unknown;
    const validated = cronJobsFileSourceSchema.safeParse(parsed);

    if (!validated.success) {
      return createReadResult({
        data: { jobs: [] },
        issues: [
          createParseFailedIssue({
            id: `cron-jobs-invalid-shape-${agentRootPath}`,
            summary: "Cron jobs file had an unexpected shape",
            detail:
              validated.error.issues[0]?.message ??
              "Hermes Console expected cron/jobs.json to contain a valid jobs array.",
            path: jobsPath,
          }),
        ],
      });
    }

    return createReadResult({
      data: validated.data,
    });
  } catch (error) {
    const issueFactory =
      error instanceof SyntaxError
        ? createParseFailedIssue
        : createUnreadablePathIssue;

    return createReadResult({
      data: { jobs: [] },
      issues: [
        issueFactory({
          id: `cron-jobs-read-failed-${agentRootPath}`,
          summary: "Cron jobs file could not be read",
          detail:
            error instanceof Error
              ? error.message
              : "Hermes Console could not read the cron jobs file.",
          path: jobsPath,
        }),
      ],
    });
  }
}

export function readCronJobsFile(agentRootPath: string) {
  return readCronJobsFileResult(agentRootPath).data;
}

export function readCronOutputHistoryResult(
  agentRootPath: string,
): ReadResult<Map<string, CronRunOutputRecord[]>> {
  const outputRoot = path.join(agentRootPath, "cron", "output");

  if (!fs.existsSync(outputRoot)) {
    return createReadResult({
      data: new Map<string, CronRunOutputRecord[]>(),
    });
  }

  const byJob = new Map<string, CronRunOutputRecord[]>();
  const issues: HermesQueryIssue[] = [];

  try {
    for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const jobId = entry.name;
      const jobOutputDir = path.join(outputRoot, jobId);

      try {
        const outputs = fs
          .readdirSync(jobOutputDir, { withFileTypes: true })
          .filter((child) => child.isFile() && child.name.endsWith(".md"))
          .map((child) => {
            const outputPath = path.join(jobOutputDir, child.name);
            const rawContent = fs.readFileSync(outputPath, "utf8");
            const responsePreview = extractResponse(rawContent);

            return {
              id: `${jobId}:${child.name}`,
              jobId,
              fileName: child.name,
              path: outputPath,
              createdAt: parseOutputTimestamp(child.name),
              responsePreview,
              responseState: resolveResponseState(responsePreview),
              rawContent,
            } satisfies CronRunOutputRecord;
          })
          .sort((left, right) => {
            const leftTime = left.createdAt
              ? new Date(left.createdAt).getTime()
              : 0;
            const rightTime = right.createdAt
              ? new Date(right.createdAt).getTime()
              : 0;
            return rightTime - leftTime;
          });

        byJob.set(jobId, outputs);
      } catch (error) {
        issues.push(
          createUnreadablePathIssue({
            id: `cron-output-read-failed-${jobId}`,
            summary: "Cron output history could not be read",
            detail:
              error instanceof Error
                ? error.message
                : "Hermes Console could not read the cron output history.",
            path: jobOutputDir,
          }),
        );
      }
    }
  } catch (error) {
    return createReadResult({
      data: new Map<string, CronRunOutputRecord[]>(),
      issues: [
        createUnreadablePathIssue({
          id: `cron-output-root-read-failed-${agentRootPath}`,
          summary: "Cron output directory could not be read",
          detail:
            error instanceof Error
              ? error.message
              : "Hermes Console could not read the cron output directory.",
          path: outputRoot,
        }),
      ],
    });
  }

  return createReadResult({
    data: byJob,
    issues,
  });
}

export function readCronOutputHistory(agentRootPath: string) {
  return readCronOutputHistoryResult(agentRootPath).data;
}
