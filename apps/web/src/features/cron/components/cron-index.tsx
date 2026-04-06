import { Link } from "@tanstack/react-router";

import type { HermesCronJobSummary } from "@hermes-console/runtime";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function statusBadgeClass(tone: HermesCronJobSummary["statusTone"]) {
  switch (tone) {
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "muted":
      return "border-border/80 bg-bg/40 text-fg-muted";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
}

function attentionBadgeClass(level: HermesCronJobSummary["attentionLevel"]) {
  switch (level) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "muted":
      return "border-border/80 bg-bg/40 text-fg-muted";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
}

function outputBadgeLabel(state: HermesCronJobSummary["latestOutputState"]) {
  if (state === "silent") {
    return "silent";
  }

  if (state === "contentful") {
    return "contentful";
  }

  return "no output";
}

export function CronIndex({ jobs }: { jobs: HermesCronJobSummary[] }) {
  if (jobs.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface/70 p-4">
        <div className="rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          No cron jobs matched the current filters.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4 xl:max-h-[58rem] xl:overflow-auto">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">Scheduled jobs</h3>
        <p className="mt-2 text-sm leading-6 text-fg-muted">Jobs across all detected agents.</p>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <Link
            key={job.summaryId}
            params={{
              agentId: job.agentId,
              jobId: job.jobId,
            }}
            to="/cron/$agentId/$jobId"
            className="block rounded-md border border-border/70 bg-bg/40 p-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-fg-strong">{job.name}</p>
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{job.agentLabel}</span>
                  <span className={["rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]", statusBadgeClass(job.statusTone)].join(" ")}>{job.lastStatus ?? job.state ?? (job.enabled ? "scheduled" : "disabled")}</span>
                  <span className={["rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]", attentionBadgeClass(job.attentionLevel)].join(" ")}>{job.attentionLevel.replace("_", " ")}</span>
                  <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">{outputBadgeLabel(job.latestOutputState)}</span>
                </div>
                <p className="mt-2 truncate text-sm leading-6 text-fg-muted">{job.scheduleDisplay} · deliver {job.deliver ?? "unknown"}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-muted">
                  {job.overdue ? <span className="text-amber-200">overdue</span> : null}
                  {job.failureStreak > 0 ? <span className={job.failureStreak >= 2 ? "text-red-200" : "text-amber-200"}>streak {job.failureStreak}</span> : null}
                  {job.recentFailureCount > 0 ? <span>{job.recentFailureCount}/5 recent failures</span> : null}
                  {job.latestDurationMs != null ? <span>last {Math.round(job.latestDurationMs / 1000)}s</span> : null}
                  <span>{job.recentOutputCount} outputs</span>
                  {job.repeatCompleted != null ? <span>{job.repeatCompleted} completed</span> : null}
                  {job.originChatName ? <span>{job.originChatName}</span> : null}
                  {job.lastError ? <span className="text-red-200">{job.lastError}</span> : null}
                </div>
              </div>

              <div className="text-right text-xs text-fg-muted">
                <p className="font-medium text-fg">next {formatTimestamp(job.nextRunAt)}</p>
                <p className="mt-1">last {formatTimestamp(job.lastRunAt)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
