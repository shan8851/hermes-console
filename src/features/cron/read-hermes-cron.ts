import { readHermesInstallation } from "@/features/inventory/read-installation";
import { readCronJobsFile, readCronOutputHistory } from "@/features/cron/node-cron-sources";
import { normalizeCronJobs } from "@/features/cron/read-cron";
import type { CronAgentRef, HermesCronIndex } from "@/features/cron/types";

function compareCronJobs(left: { nextRunAt: string | null; createdAt: string | null }, right: { nextRunAt: string | null; createdAt: string | null }) {
  const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : left.createdAt ? new Date(left.createdAt).getTime() : 0;
  const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : right.createdAt ? new Date(right.createdAt).getTime() : 0;
  return leftTime - rightTime;
}

export function readHermesCron(): HermesCronIndex {
  const installation = readHermesInstallation();
  const agents = installation.agents.filter((agent) => agent.presence.cron);

  const jobs = agents
    .flatMap((agent) => {
      const agentRef: CronAgentRef = {
        id: agent.id,
        label: agent.label,
        rootPath: agent.rootPath,
        source: agent.source,
      };

      return normalizeCronJobs({
        agent: agentRef,
        rawJobs: readCronJobsFile(agent.rootPath),
        outputsByJobId: readCronOutputHistory(agent.rootPath),
      });
    })
    .sort(compareCronJobs);

  return {
    jobs,
    agentCount: installation.agents.length,
    agentsWithCron: new Set(jobs.map((job) => job.agentId)).size,
  };
}
