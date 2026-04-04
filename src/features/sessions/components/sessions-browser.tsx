"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { SessionsIndex } from "@/features/sessions/components/sessions-index";
import { SessionsSummaryGrid } from "@/features/sessions/components/sessions-summary-grid";
import type { HermesSessionSummary } from "@/features/sessions/types";

function filterSessions({
  sessions,
  query,
  agent,
  source,
  platform,
}: {
  sessions: HermesSessionSummary[];
  query: string;
  agent: string;
  source: string;
  platform: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return sessions.filter((session) => {
    if (agent !== "all" && session.agentId !== agent) {
      return false;
    }

    if (source !== "all" && (session.source ?? "unknown") !== source) {
      return false;
    }

    if (platform !== "all" && (session.platform ?? "unknown") !== platform) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      session.title,
      session.displayName,
      session.agentLabel,
      session.source,
      session.platform,
      session.model,
      session.sessionId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function createOptions(values: string[], allLabel: string) {
  return [
    { value: "all", label: allLabel },
    ...values.map((value) => ({ value, label: value })),
  ];
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function SessionsBrowser({ sessions }: { sessions: HermesSessionSummary[] }) {
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("all");
  const [source, setSource] = useState("all");
  const [platform, setPlatform] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const filteredSessions = useMemo(
    () =>
      filterSessions({
        sessions,
        query: deferredQuery,
        agent,
        source,
        platform,
      }),
    [sessions, deferredQuery, agent, source, platform],
  );

  const agents = uniqueValues(sessions.map((session) => session.agentId));
  const sources = uniqueValues(sessions.map((session) => session.source ?? "unknown"));
  const platforms = uniqueValues(sessions.map((session) => session.platform ?? "unknown"));
  const agentOptions = createOptions(agents, "All agents");
  const sourceOptions = createOptions(sources, "All sources");
  const platformOptions = createOptions(platforms, "All platforms");

  const summaryItems = [
    {
      label: "visible sessions",
      value: formatCount(filteredSessions.length),
      detail:
        filteredSessions.length === sessions.length
          ? "All aggregated sessions across detected agents."
          : `Filtered from ${formatCount(sessions.length)} total sessions.`,
      tone: "default" as const,
    },
    {
      label: "agents",
      value: formatCount(new Set(filteredSessions.map((session) => session.agentId)).size),
      detail: "Root + profile agents represented in the visible list.",
      tone: "default" as const,
    },
    {
      label: "state only",
      value: formatCount(filteredSessions.filter((session) => !session.hasMessagingMetadata).length),
      detail: "Sessions with transcript/state data but no messaging metadata join.",
      tone: "muted" as const,
    },
    {
      label: "live mix",
      value: formatCount(new Set(filteredSessions.map((session) => session.source ?? "unknown")).size),
      detail: "Distinct session source types in the current result set.",
      tone: "default" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Sessions</p>
        </div>
        <h2 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong sm:text-2xl">
          See what Hermes has actually been doing lately
        </h2>
        <p className="mt-3 text-sm leading-7 text-fg-muted">
          This view merges transcript/state data from <span className="font-mono text-xs text-fg">state.db</span> with messaging metadata from <span className="font-mono text-xs text-fg">sessions/sessions.json</span> when that join exists. If it does not, we say so instead of pretending.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-fg-muted">
          <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">state.db</span>
          <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">sessions/sessions.json</span>
          <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-accent">all agents</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, platforms, models, and session ids"
            className="min-w-0 w-full rounded-md border border-border bg-surface/70 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-muted"
          />
          <AppSelect value={agent} onChange={setAgent} options={agentOptions} ariaLabel="Filter sessions by agent" />
          <AppSelect value={source} onChange={setSource} options={sourceOptions} ariaLabel="Filter sessions by source" />
          <AppSelect value={platform} onChange={setPlatform} options={platformOptions} ariaLabel="Filter sessions by platform" />
        </div>
      </section>

      <SessionsSummaryGrid items={summaryItems} />
      <SessionsIndex sessions={filteredSessions} />
    </div>
  );
}
