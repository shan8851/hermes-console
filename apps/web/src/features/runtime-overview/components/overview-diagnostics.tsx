import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { diagnosticsQueryOptions } from '@/lib/api';
import type {
  DiagnosticsResponse,
  HermesCronJobSummary,
  HermesQueryIssue,
  HermesSessionSummary
} from '@hermes-console/runtime';

function formatCount(value: number | null) {
  if (value == null) {
    return '—';
  }

  return new Intl.NumberFormat().format(value);
}

function formatLoggedInProviders(entries: DiagnosticsResponse['data']['status']['authProviders']) {
  return entries.filter((entry) => entry.state === 'logged_in').length;
}

type DiagnosticsScope = {
  isScoped: boolean;
  label: string;
  cronJobs: HermesCronJobSummary[];
  sessions: HermesSessionSummary[];
};

const countActiveSessions = (sessions: HermesSessionSummary[]): number =>
  sessions.filter((session) => session.endedAt == null).length;

const countActiveCronJobs = (jobs: HermesCronJobSummary[]): number =>
  jobs.filter((job) => job.enabled && job.pausedAt == null).length;

const OPTIONAL_ISSUE_IDS = new Set([
  'runtime-channel-directory-missing',
  'runtime-gateway-state-missing',
  'runtime-update-cache-missing',
  'logs-directory-missing',
  'logs-sources-missing',
  'sessions-state-db-missing',
  'skills-root-missing'
]);

const isOptionalIssue = (issue: HermesQueryIssue): boolean =>
  issue.severity === 'info' ||
  OPTIONAL_ISSUE_IDS.has(issue.id) ||
  issue.id.startsWith('memory-missing:') ||
  issue.code === 'scan_disabled';

export const groupDiagnosticsIssues = (issues: HermesQueryIssue[]): HermesQueryIssue[] => {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = [issue.id, issue.code, issue.path ?? issue.lookedFor?.join('|') ?? issue.summary].join(':');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

function DiagnosticsSummary({
  diagnostics,
  scope
}: {
  diagnostics: DiagnosticsResponse['data'];
  scope: DiagnosticsScope;
}) {
  const activeSessions = scope.isScoped ? countActiveSessions(scope.sessions) : diagnostics.status.sessions.active;
  const activeJobs = scope.isScoped ? countActiveCronJobs(scope.cronJobs) : diagnostics.status.scheduledJobs.active;
  const totalJobs = scope.isScoped ? scope.cronJobs.length : diagnostics.status.scheduledJobs.total;
  const scopePrefix = scope.isScoped ? `${scope.label} scoped` : 'Global CLI';
  const summaryItems = [
    {
      label: 'doctor issues',
      value: String(diagnostics.doctor.issueCount),
      detail:
        diagnostics.doctor.issueCount > 0
          ? 'Issues reported by `hermes doctor`.'
          : 'No issues reported by `hermes doctor`.'
    },
    {
      label: 'auth providers',
      value: String(formatLoggedInProviders(diagnostics.status.authProviders)),
      detail: 'Providers currently logged in according to `hermes status`.'
    },
    {
      label: 'active sessions',
      value: formatCount(activeSessions),
      detail: `${scopePrefix} active session count${scope.isScoped ? ' from indexed profile sessions' : ' from `hermes status`'}.`
    },
    {
      label: 'scheduled jobs',
      value: activeJobs == null ? '—' : `${formatCount(activeJobs)} / ${formatCount(totalJobs)}`,
      detail: `${scopePrefix} active and total scheduled jobs${scope.isScoped ? ' from indexed cron jobs' : ' from `hermes status`'}.`
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <article key={item.label} className="rounded-md border border-border/70 bg-bg/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{item.label}</p>
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
            <article key={issue} className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-fg-strong">{issue}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RawDiagnosticsIssue({ issue }: { issue: HermesQueryIssue }) {
  const optional = isOptionalIssue(issue);

  return (
    <article className="rounded-md border border-border/70 bg-bg/35 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-fg-strong">{issue.summary}</p>
        <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
          {issue.code}
        </span>
        <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-faint">
          {optional ? 'optional/unavailable' : issue.severity}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-fg-muted">{issue.detail}</p>
      {issue.path ? <p className="mt-2 break-all font-mono text-xs text-fg-faint">{issue.path}</p> : null}
      {issue.lookedFor && issue.lookedFor.length > 0 ? (
        <p className="mt-2 break-all font-mono text-xs text-fg-faint">{issue.lookedFor.join(' · ')}</p>
      ) : null}
    </article>
  );
}

export function OverviewDiagnostics({
  overviewIssues,
  scope
}: {
  overviewIssues: HermesQueryIssue[];
  scope: DiagnosticsScope;
}) {
  const diagnosticsQuery = useQuery(diagnosticsQueryOptions());
  const diagnostics = diagnosticsQuery.data?.data ?? null;
  const issues = useMemo(
    () => groupDiagnosticsIssues([...overviewIssues, ...(diagnosticsQuery.data?.issues ?? [])]),
    [diagnosticsQuery.data?.issues, overviewIssues]
  );
  const [rawExpanded, setRawExpanded] = useState(false);
  const errorMessage = diagnosticsQuery.error?.message ?? null;

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Diagnostics</p>
        <span className="rounded-full border border-border/80 bg-bg/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">
          status + doctor
        </span>
      </div>
      <h3 className="mt-3 font-[family-name:var(--font-bricolage)] text-xl font-semibold tracking-tight text-fg-strong">
        Hermes CLI diagnostics
      </h3>
      <p className="mt-3 text-sm leading-7 text-fg-muted">
        `hermes status` and `hermes doctor` stay prominent, but they are loaded outside the server render path so the
        rest of the app keeps working if those commands are unavailable. Profile-aware counts are scoped when a profile
        is selected; doctor/auth status remains global CLI state.
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
          <DiagnosticsSummary diagnostics={diagnostics} scope={scope} />
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="mt-4 rounded-md border border-border/70 bg-bg/25 p-3">
          <button
            type="button"
            onClick={() => setRawExpanded((previous) => !previous)}
            className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium text-fg-strong">Raw read diagnostics</span>
              <span className="mt-1 block text-sm leading-6 text-fg-muted">
                {issues.length} low-level issue{issues.length === 1 ? '' : 's'} preserved for debugging.
              </span>
            </span>
            <span className="rounded-md border border-border/80 bg-bg/40 px-2.5 py-1 text-xs text-fg-muted">
              {rawExpanded ? 'Hide' : 'Show'}
            </span>
          </button>

          {rawExpanded ? (
            <div className="mt-3 space-y-3">
              {issues.map((issue) => (
                <RawDiagnosticsIssue key={`${issue.id}:${issue.path ?? issue.summary}`} issue={issue} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
