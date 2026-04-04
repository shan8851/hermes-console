import fs from "node:fs";
import path from "node:path";

export type CronJobIndexEntry = {
  id: string;
  name: string | null;
};

export function readCronJobIndex(agentRootPath: string): CronJobIndexEntry[] {
  const jobsPath = path.join(agentRootPath, "cron", "jobs.json");

  if (!fs.existsSync(jobsPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(jobsPath, "utf8")) as {
      jobs?: Array<{ id?: unknown; name?: unknown }>;
    };

    if (!Array.isArray(parsed.jobs)) {
      return [];
    }

    return parsed.jobs
      .map((job) => {
        if (typeof job.id !== "string") {
          return null;
        }

        return {
          id: job.id,
          name: typeof job.name === "string" ? job.name : null,
        } satisfies CronJobIndexEntry;
      })
      .filter((job): job is CronJobIndexEntry => Boolean(job));
  } catch {
    return [];
  }
}
