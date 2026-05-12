import { Link } from '@tanstack/react-router';

import { buildCronDependencies, type CronDependencyReference } from '@/features/cron/lib/cron-dependencies';
import type { HermesCronJobSummary } from '@hermes-console/runtime';

function DependencyRow({ dependency }: { dependency: CronDependencyReference }) {
  const statusLabel =
    dependency.status === 'ambiguous'
      ? 'ambiguous in current cron index'
      : dependency.status === 'unresolved'
        ? 'not found in current cron index'
        : dependency.job?.agentLabel;
  const className =
    'block rounded-md border border-border/70 bg-bg/40 px-3 py-2.5 transition-colors hover:border-accent/35 hover:bg-accent/5';

  if (dependency.job) {
    return (
      <Link
        className={className}
        params={{
          agentId: dependency.job.agentId,
          jobId: dependency.job.jobId
        }}
        to="/cron/$agentId/$jobId"
      >
        <p className="text-sm font-medium text-fg-strong">{dependency.job.name}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-faint">
          {dependency.job.agentLabel} · {dependency.job.jobId}
        </p>
      </Link>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border/80 bg-bg/25 px-3 py-2.5">
      <p className="break-all text-sm font-medium text-fg">{dependency.reference}</p>
      <p className="mt-1 text-xs text-fg-muted">{statusLabel}</p>
    </div>
  );
}

function DependencyGroup({
  dependencies,
  emptyText,
  title
}: {
  dependencies: CronDependencyReference[];
  emptyText: string;
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-faint">{title}</p>
        <p className="text-xs text-fg-muted">{dependencies.length}</p>
      </div>
      {dependencies.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/80 p-3 text-sm leading-6 text-fg-muted">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {dependencies.map((dependency) => (
            <DependencyRow dependency={dependency} key={dependency.id} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CronDependencyList({
  currentJob,
  jobs
}: {
  currentJob: HermesCronJobSummary;
  jobs: HermesCronJobSummary[];
}) {
  const dependencies = buildCronDependencies({
    currentJob,
    jobs
  });

  return (
    <section className="rounded-lg border border-border bg-surface/70 p-4">
      <h3 className="font-[family-name:var(--font-bricolage)] text-base font-semibold text-fg-strong">
        Job dependencies
      </h3>
      <p className="mt-2 text-sm leading-6 text-fg-muted">
        Simple upstream and downstream links derived from context references in the current cron index.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DependencyGroup
          dependencies={dependencies.upstream}
          emptyText="This job does not declare upstream context."
          title="upstream"
        />
        <DependencyGroup
          dependencies={dependencies.downstream}
          emptyText="No downstream jobs reference this job."
          title="downstream"
        />
      </div>
    </section>
  );
}
