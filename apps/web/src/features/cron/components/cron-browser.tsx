import type { QueryKey } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { RefreshButton } from "@/components/ui/refresh-button";
import { CronIndex } from "@/features/cron/components/cron-index";
import { CronSummaryGrid } from "@/features/cron/components/cron-summary-grid";
import type { HermesCronJobSummary } from "@hermes-console/runtime";

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function createOptions(values: string[], allLabel: string) {
  return [{ value: "all", label: allLabel }, ...values.map((value) => ({ value, label: value }))];
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function filterJobs({
  jobs,
  query,
  agent,
  status,
}: {
  jobs: HermesCronJobSummary[];
  query: string;
  agent: string;
  status: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return jobs.filter((job) => {
    if (agent !== "all" && job.agentId !== agent) {
      return false;
    }

    if (status !== "all" && (job.lastStatus ?? job.state ?? "unknown") !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [job.name, job.scheduleDisplay, job.deliver, job.originChatName, job.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function CronBrowser({
  jobs,
  loadedAt,
  refreshQueryKeys,
}: {
  jobs: HermesCronJobSummary[];
  loadedAt: string;
  refreshQueryKeys: QueryKey[];
}) {
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("all");
  const [status, setStatus] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const filteredJobs = useMemo(
    () => filterJobs({ jobs, query: deferredQuery, agent, status }),
    [jobs, deferredQuery, agent, status],
  );

  const agentOptions = createOptions(uniqueValues(jobs.map((job) => job.agentId)), "All agents");
  const statusOptions = createOptions(uniqueValues(jobs.map((job) => job.lastStatus ?? job.state ?? "unknown")), "All states");

  const summaryItems = [
    {
      label: "visible jobs",
      value: formatCount(filteredJobs.length),
      detail: filteredJobs.length === jobs.length ? "All detected cron jobs across agents." : `Filtered from ${formatCount(jobs.length)} total jobs.`,
      tone: "default" as const,
    },
    {
      label: "needs attention",
      value: formatCount(filteredJobs.filter((job) => job.attentionLevel === "warning" || job.attentionLevel === "critical").length),
      detail: "Jobs that are overdue, flaky, or currently failing.",
      tone: "muted" as const,
    },
    {
      label: "overdue",
      value: formatCount(filteredJobs.filter((job) => job.overdue).length),
      detail: "Enabled jobs whose next run time is more than 30 minutes late.",
      tone: "default" as const,
    },
    {
      label: "failure streaks",
      value: formatCount(filteredJobs.filter((job) => job.failureStreak > 0).length),
      detail: "Jobs with one or more consecutive failed observed runs.",
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Cron</p>
          <RefreshButton loadedAt={loadedAt} queryKeys={refreshQueryKeys} />
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">Scheduled Jobs</h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">Scheduled jobs across agents, with run state and recent output.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.8fr)_repeat(2,minmax(0,1fr))]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, schedules, delivery targets, and job ids"
            className="min-w-0 w-full rounded-md border border-border bg-surface/70 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-muted"
          />
          <AppSelect value={agent} onChange={setAgent} options={agentOptions} ariaLabel="Filter cron jobs by agent" />
          <AppSelect value={status} onChange={setStatus} options={statusOptions} ariaLabel="Filter cron jobs by state" />
        </div>
      </section>

      <CronSummaryGrid items={summaryItems} />
      <CronIndex jobs={filteredJobs} />
    </div>
  );
}
