import fs from "node:fs";
import path from "node:path";

import type { CronRunOutputRecord } from "@/features/cron/types";

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

export function readCronJobsFile(agentRootPath: string) {
  const jobsPath = path.join(agentRootPath, "cron", "jobs.json");

  if (!fs.existsSync(jobsPath)) {
    return { jobs: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(jobsPath, "utf8")) as { jobs?: Array<Record<string, unknown>> };
  } catch {
    return { jobs: [] };
  }
}

export function readCronOutputHistory(agentRootPath: string) {
  const outputRoot = path.join(agentRootPath, "cron", "output");

  if (!fs.existsSync(outputRoot)) {
    return new Map<string, CronRunOutputRecord[]>();
  }

  const byJob = new Map<string, CronRunOutputRecord[]>();

  for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const jobId = entry.name;
    const jobOutputDir = path.join(outputRoot, jobId);
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
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });

    byJob.set(jobId, outputs);
  }

  return byJob;
}
