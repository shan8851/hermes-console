"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { CronIndex } from "@/features/cron/components/cron-index";
import { CronSummaryGrid } from "@/features/cron/components/cron-summary-grid";
import type { HermesCronJobSummary } from "@/features/cron/types";

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

export function CronBrowser({ jobs }: { jobs: HermesCronJobSummary[] }) {
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
      label: "failing",
      value: formatCount(filteredJobs.filter((job) => job.statusTone === "error").length),
      detail: "Jobs with explicit errors or failing last-run state.",
      tone: "muted" as const,
    },
    {
      label: "silent runs",
      value: formatCount(filteredJobs.filter((job) => job.latestOutputState === "silent").length),
      detail: "Jobs whose most recent captured output was intentionally silent.",
      tone: "default" as const,
    },
    {
      label: "contentful",
      value: formatCount(filteredJobs.filter((job) => job.latestOutputState === "contentful").length),
      detail: "Jobs with a substantive latest output worth opening.",
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Cron</p>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">Make scheduled work obvious instead of archaeological</h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">This view reads the real <span className="font-mono text-xs text-fg">cron/jobs.json</span> files and recent output markdown so you can see what is scheduled, what actually ran, and whether the latest run produced anything useful.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-fg-muted">
          <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">cron/jobs.json</span>
          <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">cron/output/*</span>
          <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">all agents</span>
        </div>
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
