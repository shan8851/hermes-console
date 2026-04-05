import type {
  CronAgentRef,
  CronJobRecord,
  CronObservedRunRecord,
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

function isFailureStatus(value: string | null) {
  if (!value) {
    return false;
  }

  return ["error", "failed", "failure", "cancelled", "timeout", "timed_out", "crashed"].includes(value.toLowerCase());
}

function resolveObservedRunSummary(runs: CronObservedRunRecord[]) {
  const sortedRuns = [...runs].sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
  const recentRuns = sortedRuns.slice(0, 5);

  let failureStreak = 0;
  for (const run of sortedRuns) {
    if (run.success) {
      break;
    }
    failureStreak += 1;
  }

  const durations = sortedRuns.map((run) => run.durationMs).filter((value): value is number => typeof value === "number" && value >= 0);
  const averageDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;

  return {
    failureStreak,
    recentFailureCount: recentRuns.filter((run) => !run.success).length,
    observedRunCount: sortedRuns.length,
    latestDurationMs: sortedRuns[0]?.durationMs ?? null,
    averageDurationMs,
  };
}

function resolveAttentionLevel({
  enabled,
  overdue,
  failureStreak,
  recentFailureCount,
  lastStatus,
  lastError,
}: {
  enabled: boolean;
  overdue: boolean;
  failureStreak: number;
  recentFailureCount: number;
  lastStatus: string | null;
  lastError: string | null;
}): HermesCronJobSummary["attentionLevel"] {
  if (!enabled) {
    return "muted";
  }

  if (failureStreak >= 2 || recentFailureCount >= 3) {
    return "critical";
  }

  if (overdue || recentFailureCount > 0 || isFailureStatus(lastStatus) || Boolean(lastError)) {
    return "warning";
  }

  return "healthy";
}

export function normalizeCronJobs({
  agent,
  rawJobs,
  outputsByJobId,
  runsByJobId,
  now = new Date().toISOString(),
}: {
  agent: CronAgentRef;
  rawJobs: { jobs?: Array<Record<string, unknown>> };
  outputsByJobId: Map<string, CronRunOutputRecord[]>;
  runsByJobId: Map<string, CronObservedRunRecord[]>;
  now?: string;
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
      const observedRuns = runsByJobId.get(jobId) ?? [];
      const enabled = Boolean(job.enabled);
      const lastStatus = normalizeLastStatus(job.last_status);
      const lastError = typeof job.last_error === "string" ? job.last_error : null;

      const schedule = typeof job.schedule === "object" && job.schedule ? (job.schedule as Record<string, unknown>) : null;
      const repeat = typeof job.repeat === "object" && job.repeat ? (job.repeat as Record<string, unknown>) : null;
      const origin = typeof job.origin === "object" && job.origin ? (job.origin as Record<string, unknown>) : null;
      const observedSummary = resolveObservedRunSummary(observedRuns);
      const nextRunAt = normalizeDateString(typeof job.next_run_at === "string" ? job.next_run_at : null);
      const overdue =
        enabled && Boolean(nextRunAt) && new Date(now).getTime() - new Date(nextRunAt!).getTime() > 30 * 60 * 1000;
      const attentionLevel = resolveAttentionLevel({
        enabled,
        overdue,
        failureStreak: observedSummary.failureStreak,
        recentFailureCount: observedSummary.recentFailureCount,
        lastStatus,
        lastError,
      });

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
        attentionLevel,
        overdue,
        failureStreak: observedSummary.failureStreak,
        recentFailureCount: observedSummary.recentFailureCount,
        observedRunCount: observedSummary.observedRunCount,
        latestDurationMs: observedSummary.latestDurationMs,
        averageDurationMs: observedSummary.averageDurationMs,
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

export type { CronJobRecord, CronObservedRunRecord, CronRunOutputRecord } from "@/features/cron/types";
