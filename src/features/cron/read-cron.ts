import type {
  CronAgentRef,
  CronJobRecord,
  CronRunOutputRecord,
  HermesCronJobDetail,
  HermesCronJobSummary,
} from "@/features/cron/types";

function normalizeDateString(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeLastStatus(value: unknown) {
  return typeof value === "string" ? value : null;
}

function resolveStatusTone({
  enabled,
  lastStatus,
  lastError,
}: {
  enabled: boolean;
  lastStatus: string | null;
  lastError: string | null;
}): HermesCronJobSummary["statusTone"] {
  if (lastStatus === "error" || Boolean(lastError)) {
    return "error";
  }

  if (!enabled) {
    return "muted";
  }

  if (lastStatus === "running" || lastStatus === "pending") {
    return "warning";
  }

  return "healthy";
}

function normalizePrompt(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeCronJobs({
  agent,
  rawJobs,
  outputsByJobId,
}: {
  agent: CronAgentRef;
  rawJobs: { jobs?: Array<Record<string, unknown>> };
  outputsByJobId: Map<string, CronRunOutputRecord[]>;
}): HermesCronJobSummary[] {
  const jobs = Array.isArray(rawJobs.jobs) ? rawJobs.jobs : [];

  return jobs
    .map((job) => {
      const jobId = typeof job.id === "string" ? job.id : null;

      if (!jobId) {
        return null;
      }

      const outputs = outputsByJobId.get(jobId) ?? [];
      const latestOutput = outputs[0] ?? null;
      const enabled = Boolean(job.enabled);
      const lastStatus = normalizeLastStatus(job.last_status);
      const lastError = typeof job.last_error === "string" ? job.last_error : null;

      const schedule = typeof job.schedule === "object" && job.schedule ? (job.schedule as Record<string, unknown>) : null;
      const repeat = typeof job.repeat === "object" && job.repeat ? (job.repeat as Record<string, unknown>) : null;
      const origin = typeof job.origin === "object" && job.origin ? (job.origin as Record<string, unknown>) : null;

      return {
        summaryId: `${agent.id}:${jobId}`,
        id: jobId,
        jobId,
        name: typeof job.name === "string" ? job.name : jobId,
        agentId: agent.id,
        agentLabel: agent.label,
        agentRootPath: agent.rootPath,
        enabled,
        state: typeof job.state === "string" ? job.state : null,
        scheduleDisplay:
          typeof job.schedule_display === "string"
            ? job.schedule_display
            : typeof schedule?.display === "string"
              ? schedule.display
              : "unknown",
        createdAt: normalizeDateString(typeof job.created_at === "string" ? job.created_at : null),
        nextRunAt: normalizeDateString(typeof job.next_run_at === "string" ? job.next_run_at : null),
        lastRunAt: normalizeDateString(typeof job.last_run_at === "string" ? job.last_run_at : null),
        lastStatus,
        lastError,
        deliver: typeof job.deliver === "string" ? job.deliver : null,
        prompt: normalizePrompt(job.prompt),
        skills: Array.isArray(job.skills) ? job.skills.filter((value): value is string => typeof value === "string") : [],
        skill: typeof job.skill === "string" ? job.skill : null,
        scheduleKind: typeof schedule?.kind === "string" ? schedule.kind : null,
        repeatCompleted: typeof repeat?.completed === "number" ? repeat.completed : null,
        originChatName: typeof origin?.chat_name === "string" ? origin.chat_name : null,
        statusTone: resolveStatusTone({ enabled, lastStatus, lastError }),
        latestOutputState: latestOutput?.responseState ?? "missing",
        recentOutputCount: outputs.length,
      } satisfies HermesCronJobSummary;
    })
    .filter((job): job is HermesCronJobSummary => Boolean(job))
    .sort((left, right) => {
      const leftTime = left.nextRunAt ? new Date(left.nextRunAt).getTime() : 0;
      const rightTime = right.nextRunAt ? new Date(right.nextRunAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export function buildCronJobDetail({
  job,
  outputs,
}: {
  job: CronJobRecord | HermesCronJobSummary;
  outputs: CronRunOutputRecord[];
}): HermesCronJobDetail {
  return {
    job: {
      ...(job as HermesCronJobSummary),
      summaryId: "summaryId" in job ? job.summaryId : `${job.agentId}:${job.id}`,
      statusTone:
        "statusTone" in job
          ? job.statusTone
          : resolveStatusTone({ enabled: job.enabled, lastStatus: job.lastStatus, lastError: job.lastError }),
      latestOutputState: outputs[0]?.responseState ?? "missing",
      recentOutputCount: outputs.length,
    },
    outputs,
    recentOutputCount: outputs.length,
    latestOutputState: outputs[0]?.responseState ?? "missing",
    hasOutputs: outputs.length > 0,
  };
}

export type { CronJobRecord, CronRunOutputRecord } from "@/features/cron/types";
