import Link from "next/link";

import type { HermesCronJobDetail } from "@/features/cron/types";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function statusBadgeClass(tone: HermesCronJobDetail["job"]["statusTone"]) {
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

export function CronDetailView({ detail }: { detail: HermesCronJobDetail }) {
  const { job } = detail;

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <div className="mb-4">
          <Link href="/cron" className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg/40 px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors hover:border-accent/60 hover:text-fg">
            <span aria-hidden="true">←</span>
            <span>Back to cron</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Cron</p>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{job.agentLabel}</span>
          <span className={["rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em]", statusBadgeClass(job.statusTone)].join(" ")}>{job.lastStatus ?? job.state ?? (job.enabled ? "scheduled" : "disabled")}</span>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">{job.name}</h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">Delivery target {job.deliver ?? "unknown"} · schedule {job.scheduleDisplay}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "next run", value: formatTimestamp(job.nextRunAt), detail: `last ${formatTimestamp(job.lastRunAt)}` },
          { label: "outputs", value: String(detail.recentOutputCount), detail: `${detail.latestOutputState} latest output state` },
          { label: "completed", value: job.repeatCompleted == null ? "—" : String(job.repeatCompleted), detail: job.scheduleKind ?? "unknown schedule kind" },
          { label: "created", value: formatTimestamp(job.createdAt), detail: job.originChatName ?? "No explicit origin context" },
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-border bg-surface/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
            <p className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">Job metadata</h3>
          <div className="mt-4 space-y-3 text-sm text-fg-muted">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">job id</p>
              <p className="mt-1 break-all font-mono text-xs text-fg">{job.jobId}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">delivery</p>
              <p className="mt-1 break-all font-mono text-xs text-fg">{job.deliver ?? "—"}</p>
            </div>
            {job.lastError ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">last error</p>
                <p className="mt-1 text-red-200">{job.lastError}</p>
              </div>
            ) : null}
            {job.skill ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">primary skill</p>
                <p className="mt-1 text-fg">{job.skill}</p>
              </div>
            ) : null}
            {job.skills.length > 0 ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">loaded skills</p>
                <p className="mt-1 break-words text-fg">{job.skills.join(", ")}</p>
              </div>
            ) : null}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">prompt</p>
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-border/70 bg-bg/40 p-3 text-xs leading-6 text-fg">{job.prompt}</pre>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">Recent outputs</h3>
              <p className="mt-2 text-sm leading-6 text-fg-muted">Captured markdown outputs under <span className="font-mono text-xs text-fg">cron/output/{job.jobId}</span>.</p>
            </div>
            <p className="text-xs text-fg-muted">{detail.recentOutputCount} files</p>
          </div>

          {detail.hasOutputs ? (
            <div className="mt-4 space-y-3 xl:max-h-[56rem] xl:overflow-auto xl:pr-1">
              {detail.outputs.map((output) => (
                <article key={output.id} className="rounded-md border border-border/70 bg-bg/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">{output.responseState}</span>
                      <span className="font-mono text-xs text-fg-muted">{output.fileName}</span>
                    </div>
                    <p className="text-xs text-fg-muted">{formatTimestamp(output.createdAt)}</p>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg">{output.responsePreview}</pre>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">No output history was found for this job yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
