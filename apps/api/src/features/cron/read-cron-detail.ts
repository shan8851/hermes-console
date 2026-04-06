import { buildCronJobDetail } from "@/features/cron/read-cron";
import { readCronOutputHistoryResult } from "@/features/cron/node-cron-sources";
import { readHermesCronResult } from "@/features/cron/read-hermes-cron";
import { createReadResult, type ReadResult } from "@/lib/read-result";
import type { HermesCronJobDetail } from "@hermes-console/runtime";

export function readHermesCronDetail({
  agentId,
  jobId,
}: {
  agentId: string;
  jobId: string;
}): ReadResult<HermesCronJobDetail> | null {
  const index = readHermesCronResult();
  const job = index.data.jobs.find(
    (entry) => entry.agentId === agentId && entry.jobId === jobId,
  );

  if (!job) {
    return null;
  }

  const outputs = readCronOutputHistoryResult(job.agentRootPath);

  return createReadResult({
    data: buildCronJobDetail({
      job,
      outputs: outputs.data.get(jobId) ?? [],
    }),
    issues: [...index.issues, ...outputs.issues],
  });
}
