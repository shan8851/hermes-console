import { buildCronJobDetail } from "@/features/cron/read-cron";
import { readCronOutputHistory } from "@/features/cron/node-cron-sources";
import { readHermesCron } from "@/features/cron/read-hermes-cron";

export function readHermesCronDetail({
  agentId,
  jobId,
}: {
  agentId: string;
  jobId: string;
}) {
  const index = readHermesCron();
  const job = index.jobs.find((entry) => entry.agentId === agentId && entry.jobId === jobId);

  if (!job) {
    return null;
  }

  const outputs = readCronOutputHistory(job.agentRootPath).get(jobId) ?? [];

  return buildCronJobDetail({
    job,
    outputs,
  });
}
