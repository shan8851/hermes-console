import { useQuery } from "@tanstack/react-query";

import { diagnosticsQueryOptions } from "@/lib/api";
import type { DiagnosticsResponse } from "@hermes-console/runtime";
import type { StatusSnapshotSummary } from "@hermes-console/runtime";

function formatCount(value: number | null) {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat().format(value);
}

function formatLoggedInProviders(entries: StatusSnapshotSummary["authProviders"]) {
  return entries.filter((entry) => entry.state === "logged_in").length;
}

function DiagnosticsSummary({
  diagnostics,
}: {
  diagnostics: DiagnosticsResponse["data"];
}) {
  const summaryItems = [
    {
      label: "doctor issues",
      value: String(diagnostics.doctor.issueCount),
      detail:
        diagnostics.doctor.issueCount > 0
          ? "Issues reported by `hermes doctor`."
          : "No issues reported by `hermes doctor`.",
    },
    {
      label: "auth providers",
      value: String(formatLoggedInProviders(diagnostics.status.authProviders)),
      detail: "Providers currently logged in according to `hermes status`.",
    },
    {
      label: "active sessions",
      value: formatCount(diagnostics.status.sessions.active),
      detail: "Current active session count from `hermes status`.",
    },
    {
      label: "scheduled jobs",
      value: diagnostics.status.scheduledJobs.active == null
        ? "—"
        : `${formatCount(diagnostics.status.scheduledJobs.active)} / ${formatCount(diagnostics.status.scheduledJobs.total)}`,
      detail: "Active and total jobs from `hermes status`.",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <article
            key={item.label}
            className="rounded-md border border-border/70 bg-bg/40 p-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">
              {item.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-bricolage)] text-2xl font-semibold tracking-tight text-fg-strong">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{item.detail}</p>
          </article>
        ))}
      </div>

      {diagnostics.doctor.issues.length > 0 ? (
        <div className="space-y-3">
          {diagnostics.doctor.issues.map((issue) => (
            <article
              key={issue}
              className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3"
            >
              <p className="text-sm font-medium text-fg-strong">{issue}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OverviewDiagnostics() {
  const diagnosticsQuery = useQuery(diagnosticsQueryOptions());
  const diagnostics = diagnosticsQuery.data?.data ?? null;
  const issues = diagnosticsQuery.data?.issues ?? [];
  const errorMessage = diagnosticsQuery.error?.message ?? null;

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Diagnostics
        </p>
        <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
          status + doctor
        </span>
      </div>
      <h3 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
        Hermes CLI diagnostics
      </h3>
      <p className="mt-3 text-sm leading-7 text-fg-muted">
        `hermes status` and `hermes doctor` stay prominent, but they are loaded outside the server render path so the rest of the app keeps working if those commands are unavailable.
      </p>

      {diagnosticsQuery.isPending && !errorMessage ? (
        <div className="mt-4 rounded-md border border-dashed border-border/80 p-4 text-sm leading-6 text-fg-muted">
          Loading live CLI diagnostics.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-fg-muted">
          {errorMessage}
        </div>
      ) : null}

      {diagnostics ? (
        <div className="mt-4">
          <DiagnosticsSummary diagnostics={diagnostics} />
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="mt-4 space-y-3">
          {issues.map((issue) => (
            <article
              key={issue.id}
              className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3"
            >
              <p className="text-sm font-medium text-fg-strong">{issue.summary}</p>
              <p className="mt-2 text-sm leading-6 text-fg-muted">{issue.detail}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
