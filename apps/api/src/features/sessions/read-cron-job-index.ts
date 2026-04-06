import { readCronJobsFileResult } from "@/features/cron/node-cron-sources";
import { createReadResult, type ReadResult } from "@/lib/read-result";

export type CronJobIndexEntry = {
  id: string;
  name: string | null;
};

export function readCronJobIndexResult(
  agentRootPath: string,
): ReadResult<CronJobIndexEntry[]> {
  const jobs = readCronJobsFileResult(agentRootPath);

  return createReadResult({
    data: jobs.data.jobs.map((job) => ({
      id: job.id,
      name: job.name ?? null,
    })),
    issues: jobs.issues,
  });
}

export function readCronJobIndex(agentRootPath: string): CronJobIndexEntry[] {
  return readCronJobIndexResult(agentRootPath).data;
}
