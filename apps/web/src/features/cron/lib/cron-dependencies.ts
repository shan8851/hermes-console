import type { HermesCronJobSummary } from '@hermes-console/runtime';

export type CronDependencyReference = {
  id: string;
  job: HermesCronJobSummary | null;
  reference: string;
  status: 'resolved' | 'unresolved' | 'ambiguous';
};

export type CronDependencyGroups = {
  downstream: CronDependencyReference[];
  upstream: CronDependencyReference[];
};

const isCurrentJob = ({ currentJob, job }: { currentJob: HermesCronJobSummary; job: HermesCronJobSummary }): boolean =>
  currentJob.summaryId === job.summaryId;

const resolveReferencedJob = ({
  currentJob,
  jobs,
  reference
}: {
  currentJob: HermesCronJobSummary;
  jobs: HermesCronJobSummary[];
  reference: string;
}): CronDependencyReference => {
  const summaryMatch = jobs.find((job) => job.summaryId === reference);

  if (summaryMatch) {
    return {
      id: `upstream:${reference}`,
      job: summaryMatch,
      reference,
      status: 'resolved'
    };
  }

  const sameAgentMatch = jobs.find((job) => job.agentId === currentJob.agentId && job.jobId === reference);

  if (sameAgentMatch) {
    return {
      id: `upstream:${reference}`,
      job: sameAgentMatch,
      reference,
      status: 'resolved'
    };
  }

  const crossAgentMatches = jobs.filter((job) => job.jobId === reference || job.id === reference);

  if (crossAgentMatches.length === 1) {
    return {
      id: `upstream:${reference}`,
      job: crossAgentMatches[0] ?? null,
      reference,
      status: 'resolved'
    };
  }

  return {
    id: `upstream:${reference}`,
    job: null,
    reference,
    status: crossAgentMatches.length > 1 ? 'ambiguous' : 'unresolved'
  };
};

const resolvesToCurrentJob = ({
  currentJob,
  jobs,
  reference,
  referencingJob
}: {
  currentJob: HermesCronJobSummary;
  jobs: HermesCronJobSummary[];
  reference: string;
  referencingJob: HermesCronJobSummary;
}): boolean =>
  resolveReferencedJob({
    currentJob: referencingJob,
    jobs,
    reference
  }).job?.summaryId === currentJob.summaryId;

export const buildCronDependencies = ({
  currentJob,
  jobs
}: {
  currentJob: HermesCronJobSummary;
  jobs: HermesCronJobSummary[];
}): CronDependencyGroups => {
  const upstream = currentJob.contextFrom.map((reference) =>
    resolveReferencedJob({
      currentJob,
      jobs,
      reference
    })
  );
  const downstream = jobs
    .filter((job) => !isCurrentJob({ currentJob, job }))
    .filter((job) =>
      job.contextFrom.some((reference) =>
        resolvesToCurrentJob({
          currentJob,
          jobs,
          referencingJob: job,
          reference
        })
      )
    )
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
    .map((job) => ({
      id: `downstream:${job.summaryId}`,
      job,
      reference: job.jobId,
      status: 'resolved' as const
    }));

  return {
    downstream,
    upstream
  };
};
